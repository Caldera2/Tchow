import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const frontendOrigin = (Deno.env.get('FRONTEND_ORIGINS') || Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173').split(',')[0].trim();

const corsHeaders = {
  'Access-Control-Allow-Origin': frontendOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Component = { productId: string; componentType: 'snack' | 'drink' | 'dessert'; quantity: number };
type RequestBody = { boxSizeId?: unknown; components?: unknown; saveName?: unknown };
const componentKey = (productId: string, componentType: string) => `${productId}:${componentType}`;
const componentTypes = new Set(['snack', 'drink', 'dessert']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: { code: 'server_not_configured', message: 'Quote service is not configured.' } }, 503);

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400);
  }

  const boxSizeId = typeof body.boxSizeId === 'string' ? body.boxSizeId.trim() : '';
  const components = Array.isArray(body.components) ? body.components as Component[] : null;
  if (!boxSizeId || !components || components.length > 100 || components.some((item) =>
    !item || typeof item.productId !== 'string' || !item.productId.trim() ||
    !componentTypes.has(item.componentType) || !Number.isInteger(item.quantity) ||
    item.quantity < 1 || item.quantity > 50
  )) {
    return json({ error: { code: 'invalid_configuration', message: 'Choose valid component identifiers and quantities.' } }, 422);
  }

  const keys = components.map((item) => componentKey(item.productId, item.componentType));
  if (new Set(keys).size !== keys.length) {
    return json({ error: { code: 'duplicate_component', message: 'Each product can be selected once per component category.' } }, 422);
  }

  const saveName = typeof body.saveName === 'string' ? body.saveName.trim() : '';
  if (saveName.length > 120) return json({ error: { code: 'invalid_save_name', message: 'Saved configuration names must be 120 characters or fewer.' } }, 422);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: box, error: boxError } = await admin
    .from('box_sizes')
    .select('id,name,base_price_kobo,currency,configuration_version,snack_allowance,drink_allowance,dessert_allowance,status')
    .eq('id', boxSizeId)
    .maybeSingle();
  if (boxError) return json({ error: { code: 'box_lookup_failed', message: 'Could not load the box configuration.' } }, 500);
  if (!box || box.status !== 'published') return json({ error: { code: 'box_unavailable', message: 'That box configuration is not available.' } }, 409);

  const { data: configuredComponents, error: configuredError } = await admin
    .from('box_components')
    .select('product_id,component_type,min_quantity,max_quantity,required,products(id,name,status,is_available)')
    .eq('box_size_id', box.id);
  if (configuredError) return json({ error: { code: 'components_lookup_failed', message: 'Could not validate box components.' } }, 500);

  const configuration = new Map<string, { product: { id: string; name: string; status: string; is_available: boolean } | null; min: number; max: number; required: boolean }>();
  for (const item of configuredComponents || []) {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    configuration.set(componentKey(item.product_id, item.component_type), {
      product: product || null,
      min: Number(item.min_quantity || 0),
      max: Number(item.max_quantity || 0),
      required: Boolean(item.required),
    });
  }

  for (const item of components) {
    const rule = configuration.get(componentKey(item.productId, item.componentType));
    if (!rule || !rule.product || rule.product.status !== 'published' || !rule.product.is_available) {
      return json({ error: { code: 'component_not_allowed', message: 'One or more selected components are unavailable for this box.' } }, 409);
    }
    if (item.quantity < rule.min || item.quantity > rule.max) {
      return json({ error: { code: 'component_quantity_invalid', message: 'A selected component is outside its configured quantity range.' } }, 422);
    }
  }

  for (const [key, rule] of configuration.entries()) {
    if (rule.required && (!rule.product || rule.product.status !== 'published' || !rule.product.is_available)) {
      return json({ error: { code: 'box_unavailable', message: 'A required component is temporarily unavailable.' } }, 409);
    }
    if (rule.required) {
      const selected = components.find((item) => componentKey(item.productId, item.componentType) === key);
      if (!selected || selected.quantity < Math.max(1, rule.min)) return json({ error: { code: 'required_component_missing', message: 'Select the required components for this box.' } }, 422);
    }
  }

  const totals = { snack: 0, drink: 0, dessert: 0 };
  for (const item of components) totals[item.componentType] += item.quantity;
  if (totals.snack !== box.snack_allowance || totals.drink !== box.drink_allowance || totals.dessert !== box.dessert_allowance) {
    return json({ error: { code: 'allowance_mismatch', message: 'Component quantities must match the selected box allowances.' } }, 422);
  }

  const { data: rules, error: rulesError } = await admin
    .from('box_pricing_rules')
    .select('component_type,included_quantity,extra_unit_price_kobo')
    .eq('box_size_id', box.id);
  if (rulesError) return json({ error: { code: 'pricing_lookup_failed', message: 'Could not calculate the box quote.' } }, 500);

  const ruleMap = new Map((rules || []).map((rule) => [rule.component_type, rule]));
  const surchargeKobo = Object.entries(totals).reduce((sum, [type, quantity]) => {
    const rule = ruleMap.get(type);
    return sum + (rule ? Math.max(0, quantity - Number(rule.included_quantity)) * Number(rule.extra_unit_price_kobo) : 0);
  }, 0);
  const snapshot = components.map((item) => ({
    product_id: item.productId,
    product_name: configuration.get(componentKey(item.productId, item.componentType))?.product?.name || '',
    component_type: item.componentType,
    quantity: item.quantity,
  }));

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const authHeader = request.headers.get('Authorization');
  const authResult = authHeader ? await admin.auth.getUser(authHeader.replace(/^Bearer\\s+/i, '')) : { data: { user: null }, error: null };
  const user = authResult.data.user;
  if (saveName && !user) return json({ error: { code: 'unauthorized', message: 'Sign in to save a box configuration.' } }, 401);

  const { data: quote, error: quoteError } = await admin
    .from('box_quotes')
    .insert({
      user_id: user?.id || null,
      box_size_id: box.id,
      configuration_version: box.configuration_version,
      components_snapshot: snapshot,
      base_price_kobo: box.base_price_kobo,
      surcharge_kobo: surchargeKobo,
      total_kobo: box.base_price_kobo + surchargeKobo,
      expires_at: expiresAt,
    })
    .select('id,box_size_id,configuration_version,components_snapshot,base_price_kobo,surcharge_kobo,total_kobo,currency,expires_at')
    .single();
  if (quoteError) return json({ error: { code: 'quote_create_failed', message: 'Could not create the quote.' } }, 500);

  let savedConfiguration: { id: string; name: string } | null = null;
  if (saveName && user) {
    const { data: saved, error: saveError } = await admin
      .from('saved_box_configurations')
      .insert({ user_id: user.id, box_size_id: box.id, name: saveName })
      .select('id,name')
      .single();
    if (saveError || !saved) return json({ error: { code: 'save_failed', message: 'The quote was created, but the saved configuration could not be stored.' } }, 500);
    const { error: itemError } = await admin.from('saved_box_items').insert(snapshot.map((item) => ({
      configuration_id: saved.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name,
      component_type: item.component_type,
      quantity: item.quantity,
    })));
    if (itemError) {
      await admin.from('saved_box_configurations').delete().eq('id', saved.id).eq('user_id', user.id);
      return json({ error: { code: 'save_failed', message: 'The quote was created, but its saved items could not be stored.' } }, 500);
    }
    savedConfiguration = saved;
  }

  return json({ quote, savedConfiguration });
});

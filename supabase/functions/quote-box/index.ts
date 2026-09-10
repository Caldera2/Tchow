import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
type Component = { productId: string; componentType: 'snack' | 'drink' | 'dessert'; quantity: number };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: { code: 'server_not_configured', message: 'Quote service is not configured.' } }, 503);
  let body: { boxSizeId?: string; components?: Component[]; saveName?: string };
  try { body = await request.json(); } catch { return json({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400); }
  const components = body.components || [];
  if (!body.boxSizeId || components.length === 0 || components.some((item) => !item.productId || !['snack', 'drink', 'dessert'].includes(item.componentType) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) return json({ error: { code: 'invalid_configuration', message: 'Choose valid component identifiers and quantities.' } }, 422);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: box, error: boxError } = await admin.from('box_sizes').select('id,name,base_price_kobo,currency,configuration_version,snack_allowance,drink_allowance,dessert_allowance,status').eq('id', body.boxSizeId).maybeSingle();
  if (boxError) return json({ error: { code: 'box_lookup_failed', message: 'Could not load the box configuration.' } }, 500);
  if (!box || box.status !== 'published') return json({ error: { code: 'box_unavailable', message: 'That box configuration is not available.' } }, 409);
  const productIds = [...new Set(components.map((item) => item.productId))];
  const { data: allowed, error: allowedError } = await admin.from('box_components').select('product_id,component_type,products(id,name,status,is_available)').eq('box_size_id', box.id).in('product_id', productIds);
  if (allowedError) return json({ error: { code: 'components_lookup_failed', message: 'Could not validate box components.' } }, 500);
  const allowedMap = new Map((allowed || []).filter((item) => item.products?.status === 'published' && item.products?.is_available).map((item) => [`${item.product_id}:${item.component_type}`, item.products]));
  if (components.some((item) => !allowedMap.has(`${item.productId}:${item.componentType}`))) return json({ error: { code: 'component_not_allowed', message: 'One or more selected components are unavailable for this box.' } }, 409);
  const totals = components.reduce((result, item) => ({ ...result, [item.componentType]: (result[item.componentType] || 0) + item.quantity }), {} as Record<string, number>);
  if (totals.snack !== box.snack_allowance || totals.drink !== box.drink_allowance || totals.dessert !== box.dessert_allowance) return json({ error: { code: 'allowance_mismatch', message: 'Component quantities must match the selected box allowances.' } }, 422);
  const { data: rules, error: rulesError } = await admin.from('box_pricing_rules').select('component_type,included_quantity,extra_unit_price_kobo').eq('box_size_id', box.id);
  if (rulesError) return json({ error: { code: 'pricing_lookup_failed', message: 'Could not calculate the box quote.' } }, 500);
  const ruleMap = new Map((rules || []).map((rule) => [rule.component_type, rule]));
  const surchargeKobo = Object.entries(totals).reduce((sum, [type, quantity]) => { const rule = ruleMap.get(type); if (!rule) return sum; return sum + Math.max(0, quantity - rule.included_quantity) * rule.extra_unit_price_kobo; }, 0);
  const snapshot = components.map((item) => ({ product_id: item.productId, product_name: allowedMap.get(`${item.productId}:${item.componentType}`).name, component_type: item.componentType, quantity: item.quantity }));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const authHeader = request.headers.get('Authorization'); const user = authHeader ? (await admin.auth.getUser(authHeader.replace('Bearer ', ''))).data.user : null;
  const { data: quote, error: quoteError } = await admin.from('box_quotes').insert({ user_id: user?.id || null, box_size_id: box.id, configuration_version: box.configuration_version, components_snapshot: snapshot, base_price_kobo: box.base_price_kobo, surcharge_kobo: surchargeKobo, total_kobo: box.base_price_kobo + surchargeKobo, expires_at: expiresAt }).select('id,box_size_id,configuration_version,components_snapshot,base_price_kobo,surcharge_kobo,total_kobo,currency,expires_at').single();
  if (quoteError) return json({ error: { code: 'quote_create_failed', message: 'Could not create the quote.' } }, 500);
  if (body.saveName && user) { const { data: saved, error: saveError } = await admin.from('saved_box_configurations').insert({ user_id: user.id, box_size_id: box.id, name: body.saveName.trim() }).select('id').single(); if (!saveError && saved) await admin.from('saved_box_items').insert(snapshot.map((item) => ({ configuration_id: saved.id, product_id: item.product_id, product_name_snapshot: item.product_name, component_type: item.component_type, quantity: item.quantity }))); }
  return json({ quote });
});

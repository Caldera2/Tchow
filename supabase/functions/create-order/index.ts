import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const frontendOrigin = (Deno.env.get('FRONTEND_ORIGINS') || Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173').split(',')[0].trim();

const corsHeaders = { 'Access-Control-Allow-Origin': frontendOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

async function fingerprint(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceKey || !supabaseUrl) return json({ error: { code: 'server_not_configured', message: 'Order service is not configured.' } }, 503);
  let draft: { idempotencyKey?: string; customer?: Record<string, string>; delivery?: Record<string, string>; items?: unknown[] };
  try { draft = await request.json(); } catch { return json({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400); }
  const idempotencyKey = request.headers.get('idempotency-key') || draft.idempotencyKey;
  const customer = draft.customer || {}; const delivery = draft.delivery || {};
  if (!idempotencyKey || !customer.name || !customer.email || !customer.phone || !delivery.address || !delivery.serviceAreaId || !delivery.slotId || !delivery.deliveryDate || !Array.isArray(draft.items) || draft.items.length === 0) return json({ error: { code: 'invalid_order', message: 'Complete customer details, delivery selection, and order items.' } }, 422);
  if (draft.items.some((item: any) => (!item?.productId && !item?.boxQuoteId) || (item.productId && item.boxQuoteId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) return json({ error: { code: 'invalid_items', message: 'Each item must have one valid product or box quote and quantity.' } }, 422);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authHeader = request.headers.get('Authorization');
  const user = authHeader ? (await admin.auth.getUser(authHeader.replace('Bearer ', ''))).data.user : null;
  if (!user) return json({ error: { code: 'unauthorized', message: 'Sign-in is required before placing an order.' } }, 401);
  const requestFingerprint = await fingerprint({ customer, delivery, items: draft.items });
  const { data, error } = await admin.rpc('create_order_transaction', { p_user_id: user.id, p_idempotency_key: idempotencyKey, p_request_fingerprint: requestFingerprint, p_customer: customer, p_delivery: delivery, p_items: draft.items });
  if (error) {
    const conflictCodes = ['idempotency_key_reused', 'delivery_selection_invalid', 'delivery_date_in_past', 'delivery_schedule_invalid', 'delivery_closed', 'delivery_cutoff_passed', 'slot_capacity_reached', 'product_unavailable', 'quote_invalid', 'quote_stale', 'order_item_invalid'];
    const status = conflictCodes.includes(error.message) ? (error.message === 'order_item_invalid' || error.message === 'delivery_date_in_past' ? 422 : 409) : 500;
    return json({ error: { code: error.message || 'order_create_failed', message: error.message === 'idempotency_key_reused' ? 'This retry key was already used for different order contents.' : 'Could not create the order.' } }, status);
  }
  return json(data);
});

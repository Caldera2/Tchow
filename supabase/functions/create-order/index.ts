import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type DraftItem = { productId?: string; boxQuoteId?: string; quantity: number; notes?: string };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceKey || !supabaseUrl) return json({ error: { code: 'server_not_configured', message: 'Order service is not configured.' } }, 503);

  let draft: { idempotencyKey?: string; customer?: Record<string, string>; delivery?: Record<string, string>; items?: DraftItem[] };
  try { draft = await request.json(); } catch { return json({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400); }
  const idempotencyKey = request.headers.get('idempotency-key') || draft.idempotencyKey;
  const items = draft.items || [];
  const customer = draft.customer || {};
  const delivery = draft.delivery || customer;
  if (!idempotencyKey || items.length === 0 || !customer.name || !customer.email || !customer.phone || !delivery.address || !delivery.serviceAreaId || !delivery.slotId || !delivery.deliveryDate) return json({ error: { code: 'invalid_order', message: 'Complete customer details and select a configured delivery area, date, and slot.' } }, 422);
  if (items.some((item) => (!item.productId && !item.boxQuoteId) || (item.productId && item.boxQuoteId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) return json({ error: { code: 'invalid_items', message: 'Each item must have a valid product or box quote and quantity.' } }, 422);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: deliveryArea } = await admin.from('delivery_service_areas').select('id,is_active,delivery_zones!inner(id,fee_kobo,estimated_minutes,is_active,delivery_time_slots!inner(id,is_active))').eq('id', delivery.serviceAreaId).eq('is_active', true).maybeSingle();
  const deliveryZone = deliveryArea?.delivery_zones?.find((zone: any) => zone.is_active && zone.delivery_time_slots?.some((slot: any) => slot.id === delivery.slotId && slot.is_active));
  if (!deliveryArea || !deliveryZone) return json({ error: { code: 'unsupported_delivery_selection', message: 'The selected delivery area or slot is no longer available.' } }, 409);
  const deliveryWeekday = new Date(`${delivery.deliveryDate}T00:00:00Z`).getUTCDay();
  const { data: deliverySchedule } = await admin.from('delivery_schedules').select('weekday').eq('zone_id', deliveryZone.id).eq('weekday', deliveryWeekday).maybeSingle();
  if (!deliverySchedule) return json({ error: { code: 'outside_operating_schedule', message: 'Delivery is not available on the selected date.' } }, 409);
  const { data: deliveryClosure } = await admin.from('delivery_closures').select('id').or(`zone_id.eq.${deliveryZone.id},zone_id.is.null`).lte('starts_at', `${delivery.deliveryDate}T23:59:59Z`).gte('ends_at', `${delivery.deliveryDate}T00:00:00Z`).maybeSingle();
  if (deliveryClosure) return json({ error: { code: 'delivery_closed', message: 'Delivery is closed on the selected date.' } }, 409);
  const { data: existing, error: existingError } = await admin.from('orders').select('id, order_number, status, payment_status, subtotal_kobo, delivery_fee_kobo, total_kobo').eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existingError) return json({ error: { code: 'lookup_failed', message: 'Could not check the order request.' } }, 500);
  if (existing) return json({ order: existing, duplicate: true });

  const authHeader = request.headers.get('Authorization');
  const user = authHeader ? (await admin.auth.getUser(authHeader.replace('Bearer ', ''))).data.user : null;
  if (!user) return json({ error: { code: 'unauthorized', message: 'Sign-in is required before placing an order.' } }, 401);
  const productIds = [...new Set(items.filter((item) => item.productId).map((item) => item.productId!))];
  const { data: products, error: productsError } = productIds.length ? await admin.from('products').select('id, name, price_kobo, is_available, status').in('id', productIds) : { data: [], error: null };
  if (productsError) return json({ error: { code: 'products_unavailable', message: 'Could not validate menu items.' } }, 500);
  const productMap = new Map((products || []).map((product) => [product.id, product]));
  if (items.some((item) => item.productId && (!productMap.get(item.productId)?.is_available || productMap.get(item.productId)?.status !== 'published'))) return json({ error: { code: 'item_unavailable', message: 'One or more selected items are unavailable.' } }, 409);
  const { data: productSchedules } = productIds.length ? await admin.from('product_delivery_schedules').select('product_id,weekday,starts_on,ends_on,is_active').in('product_id', productIds).eq('is_active', true) : { data: [], error: null };
  if ((productSchedules || []).some((schedule: any) => schedule.weekday !== null && schedule.weekday !== deliveryWeekday && productIds.includes(schedule.product_id))) return json({ error: { code: 'product_schedule_unavailable', message: 'One or more selected products are not available on the selected date.' } }, 409);
  const quoteIds = [...new Set(items.filter((item) => item.boxQuoteId).map((item) => item.boxQuoteId!))];
  const now = new Date().toISOString();
  const { data: quotes, error: quotesError } = quoteIds.length ? await admin.from('box_quotes').select('id,box_size_id,user_id,total_kobo,currency,expires_at,consumed_at,components_snapshot,box_sizes(name)').in('id', quoteIds) : { data: [], error: null };
  if (quotesError) return json({ error: { code: 'quotes_unavailable', message: 'Could not validate custom box quotes.' } }, 500);
  const quoteMap = new Map((quotes || []).map((quote) => [quote.id, quote]));
  if (items.some((item) => item.boxQuoteId && (!quoteMap.get(item.boxQuoteId) || quoteMap.get(item.boxQuoteId)?.consumed_at || quoteMap.get(item.boxQuoteId)!.expires_at <= now || (quoteMap.get(item.boxQuoteId)?.user_id && quoteMap.get(item.boxQuoteId)?.user_id !== user.id)))) return json({ error: { code: 'quote_expired_or_invalid', message: 'One or more custom box quotes have expired or are no longer valid.' } }, 409);
  const boxIds = [...new Set((quotes || []).map((quote) => quote.box_size_id))];
  const { data: currentBoxes, error: currentBoxesError } = boxIds.length ? await admin.from('box_sizes').select('id,configuration_version,status').in('id', boxIds) : { data: [], error: null };
  if (currentBoxesError) return json({ error: { code: 'box_configuration_unavailable', message: 'Could not revalidate custom box configuration.' } }, 500);
  const currentBoxMap = new Map((currentBoxes || []).map((box) => [box.id, box]));
  if (items.some((item) => item.boxQuoteId && (!currentBoxMap.get(quoteMap.get(item.boxQuoteId)!.box_size_id) || currentBoxMap.get(quoteMap.get(item.boxQuoteId)!.box_size_id)!.status !== 'published' || currentBoxMap.get(quoteMap.get(item.boxQuoteId)!.box_size_id)!.configuration_version !== quoteMap.get(item.boxQuoteId)!.configuration_version))) return json({ error: { code: 'quote_stale', message: 'The box configuration changed. Request a fresh quote.' } }, 409);

  const orderItems = items.map((item) => { if (item.boxQuoteId) { const quote = quoteMap.get(item.boxQuoteId)!; return { product_id: null, box_quote_id: quote.id, product_name_snapshot: `${quote.box_sizes?.name || 'Custom box'} (quoted)`, unit_price_kobo: quote.total_kobo, quantity: item.quantity, line_total_kobo: quote.total_kobo * item.quantity, components_snapshot: quote.components_snapshot, notes: item.notes || null }; } const product = productMap.get(item.productId!)!; return { product_id: product.id, box_quote_id: null, product_name_snapshot: product.name, unit_price_kobo: product.price_kobo, quantity: item.quantity, line_total_kobo: product.price_kobo * item.quantity, components_snapshot: null, notes: item.notes || null }; });
  const subtotalKobo = orderItems.reduce((sum, item) => sum + item.line_total_kobo, 0);
  const deliveryFeeKobo = deliveryZone.fee_kobo;
  const orderNumber = `TC-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  const deliveryAddressSnapshot = { address: delivery.address, serviceAreaId: delivery.serviceAreaId, slotId: delivery.slotId, deliveryDate: delivery.deliveryDate, city: delivery.city || null, state: delivery.state || null, instructions: delivery.instructions || null };
  const { data: order, error: orderError } = await admin.from('orders').insert({ order_number: orderNumber, user_id: user.id, idempotency_key: idempotencyKey, customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone, delivery_service_area_id: deliveryArea.id, delivery_slot_id: delivery.slotId, delivery_date: delivery.deliveryDate, delivery_address_snapshot: deliveryAddressSnapshot, currency: 'NGN', subtotal_kobo: subtotalKobo, delivery_fee_kobo: deliveryFeeKobo, discount_kobo: 0, total_kobo: subtotalKobo + deliveryFeeKobo, delivery_instructions: delivery.instructions || null }).select('id, order_number, status, payment_status, subtotal_kobo, delivery_fee_kobo, total_kobo').single();
  if (orderError) return json({ error: { code: 'order_create_failed', message: 'Could not create the order.' } }, 500);
  const { error: itemsError } = await admin.from('order_items').insert(orderItems.map((item) => ({ ...item, order_id: order.id })));
  if (itemsError) { await admin.from('orders').delete().eq('id', order.id); return json({ error: { code: 'order_items_create_failed', message: 'Could not save order items.' } }, 500); }
  const { error: snapshotError } = await admin.from('checkout_snapshots').insert({ order_id: order.id, payload: { customer, items: orderItems, subtotal_kobo: subtotalKobo, delivery_fee_kobo: deliveryFeeKobo, total_kobo: subtotalKobo + deliveryFeeKobo, captured_at: now } });
  if (snapshotError) { await admin.from('orders').delete().eq('id', order.id); return json({ error: { code: 'checkout_snapshot_failed', message: 'Could not preserve the checkout snapshot.' } }, 500); }
  if (quoteIds.length) await admin.from('box_quotes').update({ consumed_at: new Date().toISOString() }).in('id', quoteIds).is('consumed_at', null);
  return json({ order, duplicate: false });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return response({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return response({ error: { code: 'server_not_configured', message: 'Delivery service is not configured.' } }, 503);
  let body: { serviceAreaId?: string; slotId?: string; deliveryDate?: string; productIds?: string[] };
  try { body = await request.json(); } catch { return response({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400); }
  if (!body.serviceAreaId || !body.slotId || !/^\d{4}-\d{2}-\d{2}$/.test(body.deliveryDate || '')) return response({ error: { code: 'delivery_selection_required', message: 'Select a configured service area, date, and time slot.' } }, 422);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: area } = await admin.from('delivery_service_areas').select('id,is_active,delivery_zones!inner(id,fee_kobo,estimated_minutes,lead_time_minutes,order_cutoff_minutes,is_active,delivery_time_slots!inner(id,starts_at,ends_at,is_active))').eq('id', body.serviceAreaId).eq('is_active', true).maybeSingle();
  const zone = area?.delivery_zones?.find((item: any) => item.is_active && item.delivery_time_slots?.some((slot: any) => slot.id === body.slotId && slot.is_active));
  const slot = zone?.delivery_time_slots?.find((item: any) => item.id === body.slotId);
  if (!area || !zone || !slot) return response({ error: { code: 'unsupported_delivery_selection', message: 'That service area or time slot is not currently available.' } }, 409);
  const weekday = new Date(`${body.deliveryDate}T00:00:00Z`).getUTCDay();
  const { data: schedule } = await admin.from('delivery_schedules').select('weekday,opens_at,closes_at').eq('zone_id', zone.id).eq('weekday', weekday).maybeSingle();
  if (!schedule) return response({ error: { code: 'outside_operating_schedule', message: 'Delivery is not available on the selected date.' } }, 409);
  const { data: closure } = await admin.from('delivery_closures').select('id').or(`zone_id.eq.${zone.id},zone_id.is.null`).lte('starts_at', `${body.deliveryDate}T23:59:59Z`).gte('ends_at', `${body.deliveryDate}T00:00:00Z`).maybeSingle();
  if (closure) return response({ error: { code: 'delivery_closed', message: 'Delivery is closed on the selected date.' } }, 409);
  return response({ quote: { serviceAreaId: area.id, zoneId: zone.id, slotId: slot.id, deliveryDate: body.deliveryDate, feeKobo: zone.fee_kobo, estimatedMinutes: zone.estimated_minutes, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() } });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DeliveryQuote, isDeliveryRequest, dateIsPast, lagosParts, slotStartDate } from '../_shared/delivery.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return response({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return response({ error: { code: 'server_not_configured', message: 'Delivery service is not configured.' } }, 503);
  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400); }
  if (!isDeliveryRequest(body)) return response({ error: { code: 'delivery_selection_required', message: 'Select a configured service area, date, and time slot.' } }, 422);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: area, error: areaError } = await admin.from('delivery_service_areas').select('id,is_active,delivery_cities!inner(name,delivery_states!inner(name,delivery_countries!inner(code,name))),delivery_zones!inner(id,fee_kobo,estimated_minutes,lead_time_minutes,order_cutoff_minutes,timezone,is_active,delivery_time_slots!inner(id,starts_at,ends_at,is_active))').eq('id', body.serviceAreaId).eq('is_active', true).eq('delivery_zones.is_active', true).eq('delivery_zones.delivery_time_slots.is_active', true).maybeSingle();
  if (areaError) return response({ error: { code: 'delivery_lookup_failed', message: 'Could not validate the delivery area.' } }, 500);
  const zone = area?.delivery_zones?.find((candidate: any) => candidate.delivery_time_slots?.some((item: any) => item.id === body.slotId));
  const slot = zone?.delivery_time_slots?.find((candidate: any) => candidate.id === body.slotId);
  if (!area || !zone || !slot) return response({ error: { code: 'unsupported_delivery_selection', message: 'That service area or time slot is not currently available.' } }, 409);
  const now = new Date(); const requested = new Date(`${body.deliveryDate}T00:00:00Z`);
  if (Number.isNaN(requested.valueOf()) || dateIsPast(body.deliveryDate, now)) return response({ error: { code: 'delivery_date_in_past', message: 'Choose a future delivery date.' } }, 422);
  const weekday = new Date(`${body.deliveryDate}T00:00:00Z`).getUTCDay();
  const { data: schedule, error: scheduleError } = await admin.from('delivery_schedules').select('weekday,opens_at,closes_at').eq('zone_id', zone.id).eq('weekday', weekday).eq('is_active', true).maybeSingle();
  if (scheduleError) return response({ error: { code: 'schedule_lookup_failed', message: 'Could not validate delivery hours.' } }, 500);
  if (!schedule || slot.starts_at < schedule.opens_at || slot.ends_at > schedule.closes_at) return response({ error: { code: 'outside_operating_schedule', message: 'Delivery is not available during the selected time.' } }, 409);
  const { data: closures, error: closureError } = await admin.from('delivery_closures').select('id').or(`zone_id.eq.${zone.id},zone_id.is.null`).lt('starts_at', `${body.deliveryDate}T23:59:59+01:00`).gt('ends_at', `${body.deliveryDate}T00:00:00+01:00`);
  if (closureError) return response({ error: { code: 'closure_lookup_failed', message: 'Could not validate delivery closures.' } }, 500);
  if ((closures || []).length) return response({ error: { code: 'delivery_closed', message: 'Delivery is closed on the selected date.' } }, 409);
  const deliveryMoment = slotStartDate(body.deliveryDate, slot.starts_at); const leadMinutes = Number(zone.lead_time_minutes || 0); const cutoffMinutes = Number(zone.order_cutoff_minutes || 0);
  if (deliveryMoment.getTime() < now.getTime() + leadMinutes * 60000 || now.getTime() > deliveryMoment.getTime() - cutoffMinutes * 60000) return response({ error: { code: 'delivery_cutoff_passed', message: 'This delivery date and slot are no longer available. Choose a later slot.' } }, 409);
  const schedules = body.productIds.length ? await admin.from('product_delivery_schedules').select('product_id,weekday,starts_on,ends_on').in('product_id', body.productIds).eq('is_active', true) : { data: [], error: null };
  if (schedules.error) return response({ error: { code: 'product_schedule_lookup_failed', message: 'Could not validate product schedules.' } }, 500);
  for (const productId of body.productIds) { const rules = (schedules.data || []).filter((rule: any) => rule.product_id === productId); if (rules.length && !rules.some((rule: any) => (rule.weekday === null || rule.weekday === weekday) && (!rule.starts_on || body.deliveryDate >= rule.starts_on) && (!rule.ends_on || body.deliveryDate <= rule.ends_on))) return response({ error: { code: 'product_schedule_unavailable', message: 'One or more selected products are not available on the selected date.' } }, 409); }
  const quote: DeliveryQuote = { serviceAreaId: area.id, zoneId: zone.id, slotId: slot.id, deliveryDate: body.deliveryDate, feeKobo: zone.fee_kobo, estimatedMinutes: zone.estimated_minutes, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
  return response({ quote });
});

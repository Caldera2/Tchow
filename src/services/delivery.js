import { requireSupabase } from '../lib/supabase';

export const DELIVERY_REQUEST_FIELDS = ['serviceAreaId', 'slotId', 'deliveryDate', 'productIds'];

export async function listDeliveryOptions() {
  const client = requireSupabase();
  const { data, error } = await client.from('delivery_service_areas').select('id,name,slug,delivery_cities!inner(name,delivery_states!inner(name,delivery_countries!inner(code,name))),delivery_zones!inner(id,name,fee_kobo,estimated_minutes,lead_time_minutes,order_cutoff_minutes,timezone,is_active,delivery_time_slots!inner(id,name,starts_at,ends_at,is_active))').eq('is_active', true).eq('delivery_zones.is_active', true).eq('delivery_zones.delivery_time_slots.is_active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function quoteDelivery(payload) {
  const request = {
    serviceAreaId: payload?.serviceAreaId || '',
    slotId: payload?.slotId || '',
    deliveryDate: payload?.deliveryDate || '',
    productIds: Array.isArray(payload?.productIds) ? payload.productIds : [],
  };
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('validate-delivery', { body: request });
  if (error) throw error;
  return data;
}

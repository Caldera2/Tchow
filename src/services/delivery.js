import { requireSupabase } from '../lib/supabase';

export async function listDeliveryOptions() {
  const client = requireSupabase();
  const { data, error } = await client.from('delivery_service_areas').select('id,name,slug,delivery_cities!inner(name,delivery_states!inner(name,delivery_countries!inner(code,name))),delivery_zones!inner(id,name,fee_kobo,estimated_minutes,lead_time_minutes,order_cutoff_minutes),delivery_time_slots(id,name,starts_at,ends_at)').eq('is_active', true).eq('delivery_zones.is_active', true).eq('delivery_time_slots.is_active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function quoteDelivery(payload) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('validate-delivery', { body: payload });
  if (error) throw error;
  return data;
}

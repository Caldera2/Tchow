import { requireSupabase } from '../lib/supabase';

export async function listAdminOrders({ page = 0, pageSize = 20, search = '', status = '' } = {}) {
  const client = requireSupabase(); let query = client.from('orders').select('*,order_items(*),order_status_history(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
  if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
  if (status) query = query.eq('status', status);
  const { data, error, count } = await query; if (error) throw error; return { data: data || [], count: count || 0 };
}
export async function transitionOrder(payload) { const client = requireSupabase(); const { data, error } = await client.functions.invoke('transition-order', { body: payload }); if (error) throw error; return data; }
export async function requestRefund(payload) { const client = requireSupabase(); const { data, error } = await client.functions.invoke('request-refund', { body: payload }); if (error) throw error; return data; }
export async function reconcileRefund(refundId) { const client = requireSupabase(); const { data, error } = await client.functions.invoke('reconcile-refund', { body: { refundId } }); if (error) throw error; return data; }

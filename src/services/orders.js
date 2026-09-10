import { requireSupabase } from '../lib/supabase';
import { validateOrderDraft } from './contracts';

export async function createOrder(orderDraft) {
  validateOrderDraft(orderDraft);
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('create-order', { body: orderDraft });
  if (error) throw error;
  return data;
}

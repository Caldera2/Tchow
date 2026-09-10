import { requireSupabase } from '../lib/supabase';

export async function initializePayment(orderId) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('initialize-paystack-payment', { body: { orderId } });
  if (error) throw error;
  return data.payment;
}

export async function verifyPayment(reference) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('verify-paystack-payment', { body: { reference } });
  if (error) throw error;
  return data;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (request.method !== 'POST') return out({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const url = Deno.env.get('SUPABASE_URL'); const paystack = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!key || !url || !paystack || !paystack.startsWith('sk_test_') || Deno.env.get('PAYMENTS_ENABLED') !== 'true') return out({ error: { code: 'payments_disabled', message: 'Test payments are not enabled.' } }, 503);
  const token = request.headers.get('Authorization')?.replace('Bearer ', ''); const admin = createClient(url, key, { auth: { persistSession: false } }); const auth = token ? (await admin.auth.getUser(token)).data.user : null;
  if (!auth) return out({ error: { code: 'unauthorized', message: 'Sign-in is required.' } }, 401);
  let body: { orderId?: string }; try { body = await request.json(); } catch { return out({ error: { code: 'invalid_json', message: 'Invalid JSON.' } }, 400); }
  const { data: order } = await admin.from('orders').select('id,user_id,customer_email,total_kobo,currency,status,payment_status').eq('id', body.orderId).eq('user_id', auth.id).maybeSingle();
  if (!order || order.payment_status === 'paid' || order.status === 'cancelled' || order.total_kobo <= 0) return out({ error: { code: 'order_not_payable', message: 'This order cannot be paid.' } }, 409);
  const reference = `tchow-${crypto.randomUUID()}`;
  const { data: attempt, error: attemptError } = await admin.from('payment_attempts').insert({ order_id: order.id, provider: 'paystack', provider_reference: reference, amount_kobo: order.total_kobo, currency: order.currency, status: 'created' }).select('id,provider_reference,amount_kobo,currency,status').single();
  if (attemptError) return out({ error: { code: attemptError.code === '23505' ? 'payment_in_progress' : 'attempt_create_failed', message: 'There is already an active payment attempt for this order.' } }, 409);
  const callbackUrl = Deno.env.get('PUBLIC_APP_URL');
  const pay = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${paystack}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.customer_email, amount: String(order.total_kobo), currency: order.currency, reference, ...(callbackUrl ? { callback_url: `${callbackUrl}/payment-status` } : {}) }) });
  const result = await pay.json();
  if (!pay.ok || !result.status || !result.data?.authorization_url) { await admin.from('payment_attempts').update({ status: 'failed', failure_code: 'provider_initialization_failed' }).eq('id', attempt.id); return out({ error: { code: 'provider_initialization_failed', message: 'Paystack could not initialize this payment.' } }, 502); }
  await admin.from('payment_attempts').update({ status: 'redirected', checkout_url: result.data.authorization_url }).eq('id', attempt.id);
  return out({ payment: { attemptId: attempt.id, reference, checkoutUrl: result.data.authorization_url, amountKobo: order.total_kobo, currency: order.currency } });
});

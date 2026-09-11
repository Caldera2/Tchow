import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const frontendOrigin = (Deno.env.get('FRONTEND_ORIGINS') || Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173').split(',')[0].trim();
const h = { 'Access-Control-Allow-Origin': frontendOrigin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, idempotency-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (request.method !== 'POST') return out({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const url = Deno.env.get('SUPABASE_URL'); const paystack = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!key || !url || !paystack || !paystack.startsWith('sk_test_') || Deno.env.get('PAYMENTS_ENABLED') !== 'true') return out({ error: { code: 'payments_disabled', message: 'Test payments are not enabled.' } }, 503);
  const token = request.headers.get('Authorization')?.replace('Bearer ', ''); const admin = createClient(url, key, { auth: { persistSession: false } }); const authResult = token ? await admin.auth.getUser(token) : { data: { user: null }, error: null }; if (authResult.error) return out({ error: { code: 'auth_lookup_failed' } }, 401); const auth = authResult.data.user;
  if (!auth) return out({ error: { code: 'unauthorized', message: 'Sign-in is required.' } }, 401);
  let body: { orderId?: string }; try { body = await request.json(); } catch { return out({ error: { code: 'invalid_json', message: 'Invalid JSON.' } }, 400); }
  const { data: order, error: orderError } = await admin.from('orders').select('id,user_id,customer_email,total_kobo,currency,status,payment_status').eq('id', body.orderId).eq('user_id', auth.id).maybeSingle();
  if (orderError) return out({ error: { code: 'order_lookup_failed', message: 'Could not load this order.' } }, 500);
  if (!order || order.payment_status === 'paid' || order.status === 'cancelled' || order.total_kobo <= 0) return out({ error: { code: 'order_not_payable', message: 'This order cannot be paid.' } }, 409);
  const { data: activeAttempt, error: activeAttemptError } = await admin.from('payment_attempts').select('id,provider_reference,amount_kobo,currency,status,checkout_url').eq('order_id', order.id).eq('provider', 'paystack').in('status', ['created', 'redirected']).maybeSingle();
  if (activeAttemptError) return out({ error: { code: 'attempt_lookup_failed' } }, 500);
  const reference = activeAttempt?.provider_reference || `tchow-${crypto.randomUUID()}`;
  if (activeAttempt?.status === 'redirected' && activeAttempt.checkout_url) return out({ payment: { attemptId: activeAttempt.id, reference, checkoutUrl: activeAttempt.checkout_url, amountKobo: order.total_kobo, currency: order.currency, resumed: true } });
  const { data: attempt, error: attemptError } = await admin.from('payment_attempts').insert({ order_id: order.id, provider: 'paystack', provider_reference: reference, amount_kobo: order.total_kobo, currency: order.currency, status: 'created' }).select('id,provider_reference,amount_kobo,currency,status').single();
  if (attemptError && !activeAttempt) return out({ error: { code: attemptError.code === '23505' ? 'payment_in_progress' : 'attempt_create_failed', message: 'There is already an active payment attempt for this order.' } }, 409);
  const paymentAttempt = attempt || activeAttempt;
  if (!paymentAttempt) return out({ error: { code: 'attempt_unavailable', message: 'Could not create a payment attempt. Please retry.' } }, 409);
  const callbackUrl = Deno.env.get('PUBLIC_APP_URL');
  let pay: Response; try { pay = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${paystack}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.customer_email, amount: String(order.total_kobo), currency: order.currency, reference, ...(callbackUrl ? { callback_url: `${callbackUrl}/payment-status` } : {}) }), signal: AbortSignal.timeout(10000) }); } catch { const { error: timeoutError } = await admin.from('payment_attempts').update({ failure_code: 'provider_initialization_timeout', updated_at: new Date().toISOString() }).eq('id', paymentAttempt.id); if (timeoutError) return out({ error: { code: 'attempt_update_failed' } }, 500); return out({ error: { code: 'provider_initialization_timeout', message: 'Paystack initialization timed out. Retry to resume this payment.' } }, 504); }
  const result = await pay.json();
  if (!pay.ok || !result.status || !result.data?.authorization_url) { const { error: failedError } = await admin.from('payment_attempts').update({ status: 'failed', failure_code: 'provider_initialization_failed', updated_at: new Date().toISOString() }).eq('id', paymentAttempt.id); if (failedError) return out({ error: { code: 'attempt_update_failed' } }, 500); return out({ error: { code: 'provider_initialization_failed', message: 'Paystack could not initialize this payment.' } }, 502); }
  const { error: redirectError } = await admin.from('payment_attempts').update({ status: 'redirected', checkout_url: result.data.authorization_url, updated_at: new Date().toISOString() }).eq('id', paymentAttempt.id);
  if (redirectError) return out({ error: { code: 'attempt_update_failed' } }, 500);
  return out({ payment: { attemptId: paymentAttempt.id, reference, checkoutUrl: result.data.authorization_url, amountKobo: order.total_kobo, currency: order.currency } });
});

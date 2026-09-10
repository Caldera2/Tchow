import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (request.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const url = Deno.env.get('SUPABASE_URL'); const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!key || !url || !secret || !secret.startsWith('sk_test_') || Deno.env.get('PAYMENTS_ENABLED') !== 'true') return out({ error: { code: 'payments_disabled', message: 'Test payments are not enabled.' } }, 503);
  let body: { reference?: string }; try { body = await request.json(); } catch { return out({ error: { code: 'invalid_json' } }, 400); }
  if (!body.reference || !/^[A-Za-z0-9_.=-]+$/.test(body.reference)) return out({ error: { code: 'invalid_reference' } }, 422);
  const admin = createClient(url, key, { auth: { persistSession: false } }); const token = request.headers.get('Authorization')?.replace('Bearer ', ''); const authResult = token ? await admin.auth.getUser(token) : { data: { user: null }, error: null }; if (authResult.error) return out({ error: { code: 'auth_lookup_failed' } }, 401); const user = authResult.data.user;
  if (!user) return out({ error: { code: 'unauthorized', message: 'Sign-in is required.' } }, 401);
  const { data: attempt, error: attemptError } = await admin.from('payment_attempts').select('id,order_id,provider_reference,orders!inner(user_id)').eq('provider', 'paystack').eq('provider_reference', body.reference).eq('orders.user_id', user.id).maybeSingle();
  if (attemptError) return out({ error: { code: 'payment_lookup_failed' } }, 500);
  if (!attempt) return out({ error: { code: 'payment_not_found' } }, 404);
  let pay: Response; try { pay = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10000) }); } catch { return out({ error: { code: 'verification_timeout', message: 'Payment verification timed out. Please retry.' } }, 504); }
  let result: any; try { result = await pay.json(); } catch { return out({ error: { code: 'verification_failed' } }, 502); }
  if (!pay.ok || !result.status || !result.data) return out({ error: { code: 'verification_pending', message: 'Payment verification is still pending.' } }, 409);
  const data = result.data; const { data: applied, error: applyError } = await admin.rpc('apply_paystack_payment', { p_reference: data.reference, p_status: data.status, p_amount_kobo: data.amount, p_currency: data.currency, p_payload: data, p_event_id: `verify:${data.reference}:${data.id}`, p_provider_transaction_id: data.id || null });
  if (applyError) return out({ error: { code: 'payment_update_failed', message: 'Payment status could not be recorded. Please retry.' } }, 500);
  return out({ payment: applied, providerStatus: data.status });
});

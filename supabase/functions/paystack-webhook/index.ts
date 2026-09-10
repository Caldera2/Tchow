import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'x-paystack-signature, content-type' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
async function signature(raw: string, secret: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']); const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))); return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
function constantTimeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (request.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const url = Deno.env.get('SUPABASE_URL');
  if (!secret || !key || !url || !secret.startsWith('sk_test_') || Deno.env.get('PAYMENTS_ENABLED') !== 'true') return out({ error: { code: 'payments_disabled' } }, 503);
  const raw = await request.text(); const provided = request.headers.get('x-paystack-signature') || ''; const expected = await signature(raw, secret);
  if (!constantTimeEqual(provided, expected)) return out({ error: { code: 'invalid_signature' } }, 401);
  let event: any; try { event = JSON.parse(raw); } catch { return out({ error: { code: 'invalid_json' } }, 400); }
  const admin = createClient(url, key, { auth: { persistSession: false } }); const eventId = `${event.id || event.event}:${event.data?.reference || event.data?.id || 'unknown'}`;
  const { error: receiptInsertError } = await admin.from('webhook_receipts').insert({ provider: 'paystack', event_id: eventId, event_type: event.event || 'unknown', payload: event, signature_valid: true });
  if (receiptInsertError && receiptInsertError.code !== '23505') return out({ error: { code: 'receipt_failed' } }, 500);
  const { data: claimed, error: claimError } = await admin.rpc('claim_paystack_webhook', { p_provider: 'paystack', p_event_id: eventId });
  if (claimError) return out({ error: { code: 'receipt_claim_failed' } }, 500);
  if (!claimed) return out({ received: true, duplicate: true });
  if (!event.data?.reference) { const { error } = await admin.from('webhook_receipts').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('id', claimed.id); if (error) return out({ error: { code: 'receipt_update_failed' } }, 500); return out({ received: true, processed: true }); }
  const { data: applied, error: applyError } = await admin.rpc('apply_paystack_payment', { p_reference: event.data.reference, p_status: event.data.status, p_amount_kobo: event.data.amount, p_currency: event.data.currency, p_payload: event.data, p_event_id: eventId, p_provider_transaction_id: event.data.id || null });
  if (applyError) { const { error: updateError } = await admin.from('webhook_receipts').update({ processing_status: 'failed', processing_error: applyError.message }).eq('id', claimed.id); if (updateError) return out({ error: { code: 'receipt_update_failed' } }, 500); return out({ error: { code: 'payment_application_failed' } }, 500); }
  const { error: processedError } = await admin.from('webhook_receipts').update({ processing_status: 'processed', processed_at: new Date().toISOString(), processing_error: applied?.outcome === 'exception' ? applied.reason : null }).eq('id', claimed.id);
  if (processedError) return out({ error: { code: 'receipt_update_failed' } }, 500);
  return out({ received: true, processed: true, outcome: applied?.outcome || 'unknown' });
});

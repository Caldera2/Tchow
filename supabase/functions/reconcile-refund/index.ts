import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeStaff, authorizationResponse } from '../_shared/authorize-staff.ts';
const frontendOrigin = (Deno.env.get('FRONTEND_ORIGINS') || Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173').split(',')[0].trim();
const headers = { 'Access-Control-Allow-Origin': frontendOrigin, 'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers }); if (req.method !== 'POST') return out({ error: { code: 'method_not_allowed' } }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY'); if (!url || !serviceKey || !paystackKey || !paystackKey.startsWith('sk_test_') || Deno.env.get('PAYMENTS_ENABLED') !== 'true') return out({ error: { code: 'payments_disabled' } }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } }); const authorization = await authorizeStaff(req, admin, 'manage_financial'); if ('error' in authorization) return authorizationResponse(authorization, out);
  let body: any; try { body = await req.json(); } catch { return out({ error: { code: 'invalid_json' } }, 400); }
  const refund = await admin.from('refunds').select('id,status,amount_kobo,currency,provider_refund_reference,verified_transaction_id,reconciliation_attempts,requires_manual_review,verified_transactions(provider_reference,currency,amount_kobo)').eq('id', body.refundId).maybeSingle(); if (refund.error || !refund.data) return out({ error: { code: 'not_found' } }, 404);
  const refundRecord = refund.data;
  if (refundRecord.requires_manual_review) return out({ result: { status: 'pending', requiresManualReview: true } }, 202);
  const transactionRows = refundRecord.verified_transactions;
  const transaction = Array.isArray(transactionRows) ? transactionRows[0] : transactionRows;
  const transactionReference = transaction?.provider_reference;
  if (!transactionReference || transaction.currency !== refundRecord.currency || Number(transaction.amount_kobo) < Number(refundRecord.amount_kobo)) return out({ error: { code: 'reconciliation_invalid_reference' } }, 409);
  const endpoint = refundRecord.provider_refund_reference ? `https://api.paystack.co/refund/${encodeURIComponent(refundRecord.provider_refund_reference)}` : `https://api.paystack.co/refund?transaction=${encodeURIComponent(transactionReference)}&perPage=50`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${paystackKey}` }, signal: AbortSignal.timeout(10000) }); let provider: any = {}; try { provider = await response.json(); } catch { /* keep reconciliation failure explicit */ }
  if (!response.ok || !provider.status) return out({ error: { code: 'reconciliation_pending' } }, 502);
  const providerData = provider.data;
  const providerItems = Array.isArray(providerData) ? providerData : [];
  const candidates = providerItems.filter((item: any) => Number(item.amount) === Number(refundRecord.amount_kobo) && (!item.currency || String(item.currency).toUpperCase() === String(refundRecord.currency).toUpperCase()));
  const directRecord = providerData && !Array.isArray(providerData) ? providerData : undefined;
  const record = refundRecord.provider_refund_reference
    ? directRecord && String(directRecord.id) === String(refundRecord.provider_refund_reference) ? directRecord : undefined
    : candidates.length === 1 ? candidates[0] : undefined;
  if (!record) { const attempts = Number(refundRecord.reconciliation_attempts || 0) + 1; const update = await admin.from('refunds').update({ reconciliation_attempts: attempts, requires_manual_review: attempts >= 6, next_reconciliation_at: attempts >= 6 ? null : new Date(Date.now() + Math.min(3600000, 300000 * 2 ** Math.min(attempts, 4))).toISOString(), provider_status: 'not_found_yet', failure_reason: 'provider_outcome_unknown' }).eq('id', refundRecord.id); if (update.error) return out({ error: { code: 'reconciliation_failed' } }, 500); return out({ result: { status: 'pending', requiresManualReview: attempts >= 6 } }, 202); }
  const status = record.status === 'processed' ? 'successful' : ['failed', 'cancelled'].includes(record.status) ? 'failed' : 'pending'; const applied = await admin.rpc('apply_refund_provider_result', { p_refund_id: refundRecord.id, p_status: status, p_provider_refund_reference: String(record.id), p_provider_status: record.status || 'pending', p_failure_reason: status === 'failed' ? 'provider_refund_failed' : null }); if (applied.error) return out({ error: { code: 'reconciliation_failed' } }, 500); return out({ result: applied.data });
});

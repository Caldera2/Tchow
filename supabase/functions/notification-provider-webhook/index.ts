import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Content-Type': 'application/json' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function validResendSignature(raw: string, request: Request, secret: string) {
  const id = request.headers.get('svix-id'); const timestamp = request.headers.get('svix-timestamp'); const supplied = request.headers.get('svix-signature');
  if (!id || !timestamp || !supplied || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
  const digest = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, signed))));
  return supplied.split(' ').some((value) => value === `v1,${digest}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return out({ error: 'method_not_allowed' }, 405);
  const raw = await req.text(); const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!secret || !(await validResendSignature(raw, req, secret))) return out({ error: 'invalid_signature' }, 401);
  let event: any; try { event = JSON.parse(raw); } catch { return out({ error: 'invalid_json' }, 400); }
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return out({ error: 'unconfigured' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false } }); const providerEventId = req.headers.get('svix-id')!; const messageId = event.data?.email_id || event.data?.id || event.email_id || null;
  const received = await db.from('notification_provider_receipts').insert({ provider: 'resend', provider_event_id: providerEventId, provider_message_id: messageId || providerEventId, status: event.type || 'unknown', payload: event });
  if (received.error?.code === '23505') return out({ received: true, duplicate: true });
  if (received.error) return out({ error: 'receipt_failed' }, 500);
  const status = event.type === 'email.delivered' ? 'delivered' : ['email.bounced', 'email.complained', 'email.failed'].includes(event.type) ? 'bounced' : 'accepted';
  if (messageId) { const updated = await db.from('notification_outbox').update({ provider_status: status }).eq('provider', 'resend').eq('provider_message_id', messageId); if (updated.error) return out({ error: 'notification_update_failed' }, 500); }
  return out({ received: true });
});

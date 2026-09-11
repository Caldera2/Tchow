import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const backoff = (attempts: number) => new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.max(attempts - 1, 0))).toISOString();

function messageFor(job: any, template: any) {
  const payload = job.payload || {};
  const fallback: Record<string, string> = {
    order_received: `Your Tchow order ${payload.orderNumber || payload.orderId || ''} has been recorded for review.`,
    order_status_changed: `Your Tchow order status is now ${payload.status || 'updated'}.`,
    payment_verified: 'Payment verification for your Tchow order is complete.',
    cancellation_refund_update: `Your Tchow cancellation or refund status is ${payload.status || 'being reviewed'}.`,
    catering_enquiry_created: 'Your catering enquiry has been recorded for review.',
    contact_enquiry_created: 'Your contact enquiry has been recorded for review.',
    partnership_enquiry_created: 'Your partnership interest has been recorded for preliminary review.',
    staff_alert: `A Tchow operational event requires review: ${payload.event || job.event_type}.`,
  };
  return String(payload.body || fallback[job.event_type] || template?.body || `Tchow notification: ${job.event_type}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expected = Deno.env.get('NOTIFICATION_WORKER_SECRET');
  if (!expected || req.headers.get('x-notification-worker-secret') !== expected) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'unconfigured' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: jobs, error: claimError } = await db.rpc('claim_notification_jobs', { p_limit: 20 });
  if (claimError) return json({ error: 'claim_failed' }, 500);
  let processed = 0;
  for (const job of jobs || []) {
    try {
      const { data: template, error: templateError } = await db.from('notification_templates').select('subject,body').eq('key', job.event_type).eq('is_active', true).maybeSingle();
      if (templateError) throw new Error('template_lookup_failed');
      const body = messageFor(job, template);
      if (job.channel === 'internal') {
        const internal = await db.from('notification_internal_events').upsert({ outbox_id: job.id, audience: job.recipient, event_type: job.event_type, payload: { ...job.payload, body } }, { onConflict: 'outbox_id' });
        if (internal.error) throw new Error('internal_delivery_failed');
        const saved = await db.from('notification_outbox').update({ status: 'sent', provider_status: 'accepted', sent_at: new Date().toISOString(), claimed_at: null, last_error: null }).eq('id', job.id);
        if (saved.error) throw new Error('job_update_failed');
        processed += 1; continue;
      }
      if (job.channel !== 'email') throw new Error('channel_unconfigured');
      if (Deno.env.get('EMAIL_PROVIDER') !== 'resend' || !Deno.env.get('RESEND_API_KEY') || !Deno.env.get('EMAIL_FROM')) throw new Error('email_provider_unconfigured');
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.idempotency_key }, body: JSON.stringify({ from: Deno.env.get('EMAIL_FROM'), to: [job.recipient], subject: job.payload?.subject || template?.subject || job.event_type, text: body }) });
      if (!response.ok) throw new Error(`provider_${response.status}`);
      const result = await response.json();
      const saved = await db.from('notification_outbox').update({ status: 'sent', provider_status: 'accepted', provider_message_id: result.id, sent_at: new Date().toISOString(), claimed_at: null, last_error: null }).eq('id', job.id);
      if (saved.error) throw new Error('job_update_failed');
      processed += 1;
    } catch (error) {
      const attempts = Number(job.attempts || 0); const exhausted = attempts >= Number(job.max_attempts || 8);
      const failed = await db.from('notification_outbox').update({ status: exhausted ? 'failed' : 'pending', provider_status: exhausted ? 'failed' : null, last_error: String(error), available_at: exhausted ? new Date().toISOString() : backoff(attempts), failed_at: exhausted ? new Date().toISOString() : null, claimed_at: null }).eq('id', job.id);
      if (failed.error) console.error('notification_job_update_failed', failed.error.code);
    }
  }
  return json({ processed, claimed: (jobs || []).length });
});

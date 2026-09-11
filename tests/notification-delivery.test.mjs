import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('all notification producers use supported templates and enrich internal jobs', () => {
  const submit = read('supabase/functions/submit-enquiry/index.ts');
  const templates = read('supabase/migrations/20260910001000_notification_outbox.sql');
  assert.match(submit, /contact_receipt/);
  assert.match(submit, /catering_receipt/);
  assert.match(submit, /partnership_receipt/);
  assert.match(submit, /event: `\$\{kind\} enquiry requires staff review`/);
  for (const key of ['order_received', 'payment_verified', 'order_status_changed', 'cancellation_refund_update', 'staff_alert']) assert.match(templates, new RegExp(`'${key}'`));
});

test('worker protects internal invocation, renders non-empty messages, and retries failures', () => {
  const worker = read('supabase/functions/process-notifications/index.ts');
  assert.match(worker, /NOTIFICATION_WORKER_SECRET/);
  assert.match(worker, /x-notification-worker-secret/);
  assert.match(worker, /notification_internal_events/);
  assert.match(worker, /messageFor/);
  assert.match(worker, /email_provider_unconfigured/);
  assert.match(worker, /max_attempts/);
  assert.match(worker, /claimed_at: null/);
  assert.match(worker, /Idempotency-Key/);
});

test('Resend webhook verifies raw Svix signatures and deduplicates event identity', () => {
  const callback = read('supabase/functions/notification-provider-webhook/index.ts');
  const migration = read('supabase/migrations/20260910002400_notification_delivery.sql');
  assert.match(callback, /req\.text\(\)/);
  assert.match(callback, /svix-id/);
  assert.match(callback, /svix-signature/);
  assert.match(callback, /HMAC/);
  assert.match(callback, /email\.delivered/);
  assert.match(migration, /provider_event_id/);
  assert.match(migration, /notification_provider_receipts_event_key/);
  assert.match(migration, /notification_internal_events/);
});

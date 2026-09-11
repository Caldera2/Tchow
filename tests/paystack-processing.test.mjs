import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Paystack receipts have independent retryable processing states', async () => {
  const migration = await read('supabase/migrations/20260910001500_paystack_processing_states.sql');
  const webhook = await read('supabase/functions/paystack-webhook/index.ts');
  assert.match(migration, /received','processing','processed','failed/);
  assert.match(migration, /processing_attempts = processing_attempts \+ 1/);
  assert.match(webhook, /claim_paystack_webhook/);
  assert.match(webhook, /payment_application_failed/);
  assert.match(webhook, /processing_status.*'processed'/);
  const leases = await read('supabase/migrations/20260910002100_paystack_webhook_leases.sql');
  const config = await read('supabase/config.toml');
  assert.match(leases, /processing_lease_expires_at/);
  assert.match(leases, /processing_status = 'processing'.*processing_lease_expires_at/s);
  assert.match(leases, /max_processing_attempts/);
  assert.match(leases, /fail_paystack_webhook/);
  assert.match(config, /\[functions\.paystack-webhook\][\s\S]*verify_jwt = false/);
  assert.match(webhook, /fail_paystack_webhook/);
});

test('payment outcomes distinguish success from delivery acceptance and exceptions', async () => {
  const migration = await read('supabase/migrations/20260910001500_paystack_processing_states.sql');
  const status = await read('src/orders/PaymentStatus.jsx');
  const verify = await read('supabase/functions/verify-paystack-payment/index.ts');
  const replay = await read('supabase/migrations/20260910001900_payment_replay_contract.sql');
  assert.match(migration, /outcome', 'paid'/);
  assert.match(migration, /second_successful_payment/);
  assert.match(migration, /amount_or_currency_mismatch/);
  assert.match(status, /payment\.outcome/);
  assert.doesNotMatch(status, /payment\?\.accepted/);
  assert.match(verify, /orders\.user_id/);
  assert.match(verify, /p_provider_transaction_id/);
  assert.match(replay, /paymentStatus/);
  assert.match(replay, /when 'partially_refunded' then 'partially_refunded'/);
  assert.match(replay, /second_successful_payment/);
  assert.doesNotMatch(replay, /vtx\.provider_transaction_id/);
  assert.match(status, /tchow-payment-confirmed/);
  assert.match(status, /tchow-checkout-attempt/);
});

test('payment replay preserves newer cart additions and note variants', async () => {
  const cart = await read('src/hooks/useCart.js');
  const status = await read('src/orders/PaymentStatus.jsx');
  assert.match(cart, /reconcileCartWithSnapshot/);
  assert.match(cart, /entry\.notes/);
  assert.match(status, /orderSnapshot/);
  assert.doesNotMatch(status, /localStorage\.removeItem\('tchow-cart'\)/);
});

test('refund execution preserves ambiguous provider outcomes for reconciliation', async () => {
  const migration = await read('supabase/migrations/20260910002200_refund_recovery.sql');
  const request = await read('supabase/functions/request-refund/index.ts');
  const reconcile = await read('supabase/functions/reconcile-refund/index.ts');
  assert.match(migration, /request_fingerprint/);
  assert.match(migration, /refund_idempotency_key_reused/);
  assert.match(migration, /for update/);
  assert.match(request, /mark_refund_provider_unknown/);
  assert.match(request, /provider_outcome_unknown/);
  assert.match(request, /sk_test_/);
  assert.match(reconcile, /refund\?transaction=/);
  assert.match(reconcile, /requires_manual_review/);
  assert.doesNotMatch(request, /AbortError.*apply_refund_provider_result/);
});

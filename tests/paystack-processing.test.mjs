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
});

test('payment outcomes distinguish success from delivery acceptance and exceptions', async () => {
  const migration = await read('supabase/migrations/20260910001500_paystack_processing_states.sql');
  const status = await read('src/orders/PaymentStatus.jsx');
  const verify = await read('supabase/functions/verify-paystack-payment/index.ts');
  assert.match(migration, /outcome', 'paid'/);
  assert.match(migration, /second_successful_payment/);
  assert.match(migration, /amount_or_currency_mismatch/);
  assert.match(status, /payment\.outcome === 'paid'/);
  assert.doesNotMatch(status, /payment\?\.accepted/);
  assert.match(verify, /orders\.user_id/);
  assert.match(verify, /p_provider_transaction_id/);
});

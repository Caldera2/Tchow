import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('migration sequence has no destructive normalization and no duplicate storage policy', async () => {
  const legacy = await read('supabase/migrations/20260910000100_initial_tchow_schema.sql');
  const normalized = await read('supabase/migrations/20260910000200_normalize_tchow_database.sql');
  const storage = await read('supabase/migrations/20260910000400_catalogue_storage.sql');
  const payments = await read('supabase/migrations/20260910000700_paystack_payments.sql');
  assert.match(legacy, /Legacy prototype migration/);
  assert.doesNotMatch(normalized, /drop table if exists public\.(order_items|orders|products|profiles)/);
  assert.equal((storage.match(/create policy "Published catalogue images are public"/g) || []).length, 1);
  assert.match(payments, /payment_one_active_attempt_idx[^\n]*status in \('created', 'redirected'\)/);
});

test('later migrations use enum values declared by the normalized baseline', async () => {
  const normalized = await read('supabase/migrations/20260910000200_normalize_tchow_database.sql');
  const workflows = await read('supabase/migrations/20260910000800_operational_order_workflows.sql');
  assert.match(normalized, /staff_role as enum \('owner'/);
  assert.match(normalized, /order_status as enum \([^;]*'dispatched'/);
  assert.doesNotMatch(workflows, /alter type public\.(staff_role|order_status) add value/);
});

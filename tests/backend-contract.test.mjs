import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('schema protects user and operational tables with RLS', async () => {
  const sql = await read('supabase/migrations/20260910000100_initial_tchow_schema.sql');
  for (const table of ['profiles', 'products', 'orders', 'order_items', 'catering_enquiries', 'partnership_applications']) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, /check \(total_kobo = subtotal_kobo \+ delivery_fee_kobo\)/);
  assert.match(sql, /idempotency_key text not null unique/);
});

test('frontend configuration cannot contain privileged keys', async () => {
  const client = await read('src/lib/supabase.js');
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE_ROLE_KEY|PAYSTACK_SECRET_KEY/);
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
});

test('order edge function recalculates totals from database prices', async () => {
  const fn = await read('supabase/functions/create-order/index.ts');
  const transaction = await read('supabase/migrations/20260910001400_atomic_order_creation.sql');
  assert.match(fn, /create_order_transaction/);
  assert.match(transaction, /price_kobo/);
  assert.match(fn, /idempotency-key/);
  assert.match(transaction, /is_available/);
});

test('foreign-key access paths are indexed', async () => {
  const sql = await read('supabase/migrations/20260910002800_add_missing_fk_indexes.sql');
  assert.match(sql, /catering_enquiries_user_id_idx[\s\S]*catering_enquiries \(user_id\)/);
  assert.match(sql, /order_items_product_id_idx[\s\S]*order_items \(product_id\)/);
});

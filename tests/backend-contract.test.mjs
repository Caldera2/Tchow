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
  assert.match(fn, /from\('products'\)/);
  assert.match(fn, /price_kobo/);
  assert.match(fn, /idempotency-key/);
  assert.match(fn, /is_available/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('create-order loads and checks the complete quote version contract', async () => {
  const source = await read('supabase/functions/create-order/index.ts');
  const transaction = await read('supabase/migrations/20260910001400_atomic_order_creation.sql');
  assert.match(source, /create_order_transaction/);
  assert.match(transaction, /configuration_version/);
  assert.match(transaction, /v_quote public\.box_quotes/);
  assert.match(transaction, /quote_stale/);
  assert.match(transaction, /quote_component_unavailable/);
});

test('box builder protects against late quote responses and preserves quantities', async () => {
  const source = await read('catalogue/DatabaseBoxBuilder.jsx');
  const migration = await read('supabase/migrations/20260910001300_box_quote_versioning.sql');
  assert.match(source, /quoteRequest/);
  assert.match(source, /components: selected/);
  assert.match(source, /quantity: quantities\[item\.product_id\]/);
  assert.match(source, /fresh quote/);
  assert.match(migration, /box_components_bump_configuration/);
  assert.match(migration, /box_pricing_rules_bump_configuration/);
  assert.match(migration, /bump_box_size_version/);
});

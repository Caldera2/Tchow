import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('delivery contract follows area -> zone -> slot relationships', async () => {
  const service = await read('src/services/delivery.js');
  const checkout = await read('src/orders/DatabaseCheckout.jsx');
  assert.match(service, /delivery_zones!inner\([^)]*delivery_time_slots!inner/);
  assert.match(service, /delivery_zones\.delivery_time_slots\.is_active/);
  assert.match(checkout, /serviceAreaId: form\.serviceAreaId/);
  assert.match(checkout, /slotId: form\.slotId/);
  assert.match(checkout, /deliveryDate: form\.deliveryDate/);
  assert.match(checkout, /city: area\?\.delivery_cities\?\.name/);
  assert.match(checkout, /slotId: '', deliveryDate: ''/);
});

test('delivery validation rejects stale selections and accepts alternative weekday rules', async () => {
  const validate = await read('supabase/functions/validate-delivery/index.ts');
  const createOrder = await read('supabase/functions/create-order/index.ts');
  const transaction = await read('supabase/migrations/20260910001400_atomic_order_creation.sql');
  assert.match(validate, /dateIsPast/);
  assert.match(validate, /delivery_cutoff_passed/);
  assert.match(validate, /closures/);
  assert.match(validate, /rules\.some/);
  assert.match(transaction, /v_slot\.starts_at/);
  assert.match(transaction, /delivery_closures/);
  assert.match(transaction, /v_quote\.components_snapshot/);
  assert.match(transaction, /for v_item in select/);
});

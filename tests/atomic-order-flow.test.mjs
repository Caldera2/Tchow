import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('order creation is delegated to one locked database transaction', async () => {
  const edge = await read('supabase/functions/create-order/index.ts');
  const migration = await read('supabase/migrations/20260910001400_atomic_order_creation.sql');
  assert.match(edge, /admin\.auth\.getUser/);
  assert.match(edge, /requestFingerprint/);
  assert.match(edge, /create_order_transaction/);
  assert.doesNotMatch(edge, /from\('orders'\)\.select/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /for update/);
  assert.match(migration, /checkout_snapshots/);
  assert.match(migration, /order_status_history/);
  assert.match(migration, /notification_outbox/);
  assert.match(migration, /status = 'consumed'/);
  assert.match(migration, /status = 'reserved'.*or r\.status = 'consumed'/s);
  const lifecycle = await read('supabase/migrations/20260910002000_delivery_reservation_lifecycle.sql');
  assert.match(lifecycle, /expire_delivery_reservations/);
  assert.match(lifecycle, /release_delivery_reservation/);
  assert.match(lifecycle, /late_payment_after_reservation_expiry/);
  assert.match(lifecycle, /consume_paid_delivery_reservation/);
});

test('checkout keeps one retry key for identical contents', async () => {
  const checkout = await read('src/orders/DatabaseCheckout.jsx');
  assert.match(checkout, /tchow-checkout-attempt/);
  assert.match(checkout, /storedAttempt\?\.fingerprint === requestFingerprint/);
  assert.match(checkout, /createOrder\(\{ \.\.\.payload, idempotencyKey \}\)/);
});

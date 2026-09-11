import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const service = await read('src/services/catalogue.js');
const page = await read('src/catalogue/CataloguePages.jsx');
const storageSql = await read('supabase/migrations/20260910000400_catalogue_storage.sql');

test('public catalogue service requires published products and paginates', () => {
  assert.match(service, /eq\('status', 'published'\)/);
  assert.match(service, /range\(from, to\)/);
  assert.match(service, /listRelatedProducts/);
});

test('admin catalogue uses database mutations and does not fallback to fixtures', () => {
  assert.match(page, /createProduct/);
  assert.match(page, /updateProduct/);
  assert.match(page, /changeProductStatus/);
  assert.match(page, /setProductAvailability/);
  assert.doesNotMatch(page, /MENU_ITEMS|mockData/);
});

test('catalogue storage is private and staff-managed', () => {
  assert.match(storageSql, /catalogue-images', 'catalogue-images', false/);
  assert.match(storageSql, /private-documents', 'private-documents', false/);
  assert.match(storageSql, /has_staff_permission\('manage_menu'\)/);
});

test('catalogue upload validates bytes and cleans up failed records', async () => {
  const fn = await read('supabase/functions/catalogue-image-upload/index.ts');
  assert.match(fn, /validMagic/);
  assert.match(fn, /file\.size > 5 \* 1024 \* 1024/);
  assert.match(fn, /storage\.from\('catalogue-images'\)\.remove\(\[path\]\)/);
});

test('box quotes validate composition and are revalidated before ordering', async () => {
  const quote = await read('supabase/functions/quote-box/index.ts');
  const order = await read('supabase/functions/create-order/index.ts');
  const transaction = await read('supabase/migrations/20260910001400_atomic_order_creation.sql');
  assert.match(quote, /allowance_mismatch/);
  assert.match(quote, /component_not_allowed/);
  assert.match(quote, /expiresAt/);
  assert.match(quote, /configuration_version/);
  assert.match(transaction, /quote_invalid/);
  assert.match(transaction, /quote_stale/);
  assert.match(transaction, /configuration_version/);
});

test('delivery eligibility is configured and server validated', async () => {
  const migration = await read('supabase/migrations/20260910000600_delivery_eligibility.sql');
  const delivery = await read('supabase/functions/validate-delivery/index.ts');
  const order = await read('supabase/functions/create-order/index.ts');
  const transaction = await read('supabase/migrations/20260910001400_atomic_order_creation.sql');
  assert.match(migration, /delivery_service_areas/);
  assert.match(migration, /fee_kobo integer/);
  assert.match(migration, /delivery_time_slots/);
  assert.match(migration, /delivery_slot_reservations/);
  assert.match(migration, /product_delivery_schedules/);
  assert.match(delivery, /unsupported_delivery_selection/);
  assert.match(delivery, /delivery_closed/);
  assert.match(delivery, /outside_operating_schedule/);
  assert.match(transaction, /delivery_service_area_id/);
  assert.match(transaction, /v_delivery_fee := v_zone\.fee_kobo/);
});

test('Paystack payments stay server controlled and idempotent', async () => {
  const migration = await read('supabase/migrations/20260910000700_paystack_payments.sql');
  const init = await read('supabase/functions/initialize-paystack-payment/index.ts');
  const verify = await read('supabase/functions/verify-paystack-payment/index.ts');
  const webhook = await read('supabase/functions/paystack-webhook/index.ts');
  assert.match(migration, /payment_one_active_attempt_idx/);
  assert.match(migration, /apply_paystack_payment/);
  assert.match(init, /sk_test_/);
  assert.match(init, /order\.total_kobo/);
  assert.ok(init.includes("payment_attempts').insert"));
  assert.match(verify, /transaction\/verify/);
  assert.match(verify, /apply_paystack_payment/);
  assert.match(webhook, /request\.text\(\)/);
  assert.match(webhook, /x-paystack-signature/);
  assert.ok(webhook.includes("webhook_receipts').insert"));
  assert.match(migration, /amount_or_currency_mismatch/);
  assert.match(migration, /late_payment_after_order_expiry/);
});

test('admin order workflows enforce transitions and refund safeguards server-side', async () => {
  const migration = await read('supabase/migrations/20260910000800_operational_order_workflows.sql');
  const transition = await read('supabase/functions/transition-order/index.ts');
  const refund = await read('supabase/functions/request-refund/index.ts');
  const authz = await read('supabase/functions/_shared/authorize-staff.ts');
  const service = await read('src/services/adminOrders.js');
  assert.match(migration, /invalid_transition/);
  assert.match(migration, /payment_required/);
  assert.match(migration, /for update/);
  assert.match(migration, /notification_outbox/);
  assert.match(migration, /refund_exceeds_payment/);
  assert.match(migration, /requested/);
  assert.match(transition, /authorizeStaff/);
  assert.match(transition, /transition_order/);
  assert.match(refund, /request_order_refund/);
  assert.match(refund, /manage_financial/);
  assert.doesNotMatch(refund, /manage_payments/);
  assert.match(refund, /sk_test_/);
  assert.match(authz, /aal2/);
  assert.match(transition, /manage_orders/);
  assert.match(service, /range\(page \* pageSize/);
});

test('notification delivery uses a transactional outbox with claims and bounded retries', async () => {
  const migration = await read('supabase/migrations/20260910001000_notification_outbox.sql');
  const worker = await read('supabase/functions/process-notifications/index.ts');
  const callback = await read('supabase/functions/notification-provider-webhook/index.ts');
  assert.match(migration, /claim_notification_jobs/);
  assert.match(migration, /skip locked/);
  assert.match(migration, /notification_templates/);
  assert.match(worker, /max_attempts/);
  assert.match(worker, /2 \*\* Math\.max/);
  assert.match(worker, /Idempotency-Key/);
  assert.match(callback, /invalid_signature/);
  assert.match(callback, /notification_provider_receipts/);
});

test('admin overview derives figures from verified records', async () => {
  const fn = await read('supabase/functions/admin-overview/index.ts');
  const page = await read('src/admin/DatabaseAdminOverview.jsx');
  assert.match(fn, /verified_transactions/);
  assert.match(fn, /refunds/);
  assert.match(fn, /payment_status/);
  assert.match(fn, /Africa\/Lagos/);
  assert.match(fn, /audit_events/);
  assert.match(page, /Database-backed metrics/);
  assert.doesNotMatch(page, /Mock data/);
});

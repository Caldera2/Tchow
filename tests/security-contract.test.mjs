import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const sql = await readFile(new URL('supabase/migrations/20260910000300_security_hardening.sql', root), 'utf8');
const schema = await readFile(new URL('supabase/migrations/20260910000200_normalize_tchow_database.sql', root), 'utf8');

test('security migration uses protected staff records, not user metadata', () => {
  assert.match(sql, /has_staff_permission/);
  assert.match(sql, /is_owner/);
  assert.match(sql, /manage_financial/);
  assert.match(sql, /security definer set search_path = public/);
  const authorizationSql = sql.replace(/create or replace function public\.handle_new_user\(\)[\s\S]*?create trigger on_auth_user_created[\s\S]*?;/, '');
  assert.doesNotMatch(authorizationSql, /raw_user_meta_data|user_metadata/);
});

test('server-only records remain denied to browser roles', () => {
  assert.match(sql, /revoke all on public\.payment_attempts, public\.verified_transactions, public\.refunds, public\.notification_outbox, public\.webhook_receipts from anon, authenticated/);
  assert.match(sql, /revoke insert, update, delete on public\.orders, public\.order_items, public\.checkout_snapshots, public\.order_status_history from anon, authenticated/);
  assert.match(sql, /revoke insert, update, delete on public\.staff_members, public\.staff_permissions, public\.audit_events from anon, authenticated/);
});

test('operations staff cannot inherit partnership access from the prior migration', () => {
  assert.match(sql, /drop policy if exists "Staff reads partnerships"/);
  assert.match(sql, /Partnership permission reads applications/);
  assert.match(sql, /has_staff_permission\('manage_partnerships'\)/);
});

test('every exposed table remains RLS protected', () => {
  const tables = [...schema.matchAll(/create table public\.([a-z_]+)/g)].map((match) => match[1]);
  for (const table of tables) assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
});

test('RLS harness uses executable fixtures, valid claim JSON, and denial semantics', async () => {
  const harness = await readFile(new URL('supabase/tests/rls_security.sql', root), 'utf8');
  assert.match(harness, /insert into auth\.users/);
  assert.match(harness, /insert into public\.products/);
  assert.match(harness, /select set_config\('request\.jwt\.claims'/);
  assert.doesNotMatch(harness, /(?<!select )set_config\(/);
  assert.match(harness, /throws_ok\(\$\$select count\(\*\) from public\.operational_settings/);
  assert.match(harness, /count\(\*\) from public\.orders where user_id/);
  assert.match(harness, /product_images/);
  assert.match(harness, /rollback;/);
});

test('effective permissions remove broad staff access and align customer CRUD', async () => {
  const permissions = await readFile(new URL('supabase/migrations/20260910001100_effective_permissions.sql', root), 'utf8');
  assert.match(permissions, /drop policy if exists "Staff reads enquiries"/);
  assert.match(permissions, /revoke insert, update, delete on public\.contact_enquiries/);
  assert.match(permissions, /grant select, insert, update, delete on public\.customer_addresses/);
  assert.match(permissions, /grant update \(full_name, phone, preferred_communication, dietary_notes\)/);
  assert.match(permissions, /Staff notes follow record permission/);
  assert.match(permissions, /Customers own orders only/);
});

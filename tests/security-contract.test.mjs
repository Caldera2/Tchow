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
  assert.doesNotMatch(authorizationSql, /raw_user_meta_data|user_metadata|auth\.jwt/);
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

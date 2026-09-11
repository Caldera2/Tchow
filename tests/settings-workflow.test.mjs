import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('settings workflow validates typed allowlisted values and publishes deliberately', () => {
  const migration = read('supabase/migrations/20260910002300_business_settings_workflow.sql');
  assert.match(migration, /jsonb_typeof\(coalesce\(p_settings/);
  assert.match(migration, /unsupported_setting/);
  assert.match(migration, /homepage_featured_product_ids/);
  assert.match(migration, /jsonb_typeof\(value\) <> 'array'/);
  assert.match(migration, /jsonb_typeof\(value\) <> 'object'/);
  assert.match(migration, /is_published=true/);
  assert.match(migration, /is_published=false/);
  assert.match(migration, /insert into public.audit_events/);
  assert.match(migration, /revoke all on function/);
  assert.match(migration, /grant execute on function .* to service_role/);
});

test('admin settings uses the atomic server workflow and exposes publication state', () => {
  const endpoint = read('supabase/functions/admin-settings/index.ts');
  const service = read('src/services/settings.js');
  const editor = read('src/admin/DatabaseAdminSettings.jsx');
  assert.match(endpoint, /admin\.rpc\('save_business_settings'/);
  assert.doesNotMatch(endpoint, /for \(const \[keyName/);
  assert.match(service, /publishAdminSettings/);
  assert.match(service, /publishKeys/);
  assert.match(editor, /JSON\.parse/);
  assert.match(editor, /<textarea/);
  assert.match(editor, /\.is_published/);
  assert.match(editor, /Save drafts and changes/);
  assert.match(editor, /drafts\[key\] === undefined/);
  assert.match(editor, /drafts\[key\] !== ''/);
});

test('public settings reads only published rows', () => {
  const service = read('src/services/settings.js');
  assert.match(service, /from\('public_business_settings'\)/);
  assert.match(service, /eq\('is_published', true\)/);
});

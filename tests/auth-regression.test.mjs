import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('staff MFA uses the supported Supabase mfa API and fails closed', async () => {
  const auth = await read('src/auth/AuthContext.jsx');
  const security = await read('supabase/migrations/20260910000300_security_hardening.sql');
  assert.match(auth, /auth\.mfa\.getAuthenticatorAssuranceLevel/);
  assert.doesNotMatch(auth, /auth\.getAuthenticatorAssuranceLevel/);
  assert.match(auth, /Authenticator setup required/);
  assert.match(auth, /Authentication assurance unavailable/);
  assert.match(auth, /catch/);
  assert.match(security, /auth\.jwt\(\) ->> 'aal'/);
});

test('privileged operations require active staff authorization', async () => {
  const transition = await read('supabase/functions/transition-order/index.ts');
  const refund = await read('supabase/functions/request-refund/index.ts');
  const authz = await read('supabase/functions/_shared/authorize-staff.ts');
  assert.match(transition, /authorizeStaff/);
  assert.match(transition, /assuranceResponse|authorizationResponse/);
  assert.match(transition, /manage_orders/);
  assert.match(refund, /manage_financial/);
  assert.doesNotMatch(refund, /manage_payments/);
  assert.match(authz, /claims\?\.aal !== 'aal2'/);
  assert.match(authz, /getUser\(token\)/);
  assert.match(authz, /member\?\.is_active/);
  assert.match(authz, /member\.role !== 'owner'/);
  assert.match(authz, /authorizationResponse/);
});

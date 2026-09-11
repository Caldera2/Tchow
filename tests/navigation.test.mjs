import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const auth = await readFile(new URL('../src/auth/AuthContext.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/admin/DatabaseAdminEnquiries.jsx', import.meta.url), 'utf8');

test('the application uses React Router for public, protected, and fallback navigation', () => {
  assert.match(app, /<Routes>/);
  for (const route of ['/faq', '/contact', '/catering', '/investors/apply', '/admin/contact', '/admin/settings']) assert.match(app, new RegExp(`path="${route.replaceAll('/', '\\/')}"`));
  assert.match(app, /path="\*" element=\{<Error404 \/>\}/);
  assert.doesNotMatch(app, /function useRouter/);
  assert.doesNotMatch(app, /dispatchEvent\(new PopStateEvent/);
  assert.doesNotMatch(auth, /history\.pushState|dispatchEvent\(new PopStateEvent/);
});

test('confirmation and admin navigation use router links', () => {
  assert.match(app, /<Route path="\/order-confirmation" element=\{<AuthGate><DatabaseOrderConfirmation \/><\/AuthGate>\}/);
  assert.match(admin, /<Link to="\/admin\/contact">Contact<\/Link>/);
  assert.match(admin, /<Link to="\/admin\/catering">Catering<\/Link>/);
});

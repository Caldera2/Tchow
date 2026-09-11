import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/enquiries/DatabaseEnquiryPages.jsx', import.meta.url), 'utf8');

test('all active enquiry forms explicitly connect their submit handler', () => {
  for (const component of ['DatabaseContact', 'DatabaseCatering', 'DatabasePartnership']) {
    const section = source.slice(source.indexOf(`export function ${component}`), source.indexOf('\nexport function ', source.indexOf(`export function ${component}`) + 1));
    assert.match(section, /onSubmit=\{x\.submit\}/, `${component} must pass its handler to FormShell`);
    assert.match(section, /value=\{x\.form\./, `${component} must preserve controlled input values`);
  }
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /if \(busy\) return/);
  assert.match(source, /disabled=\{busy\}/);
});

test('enquiry payloads preserve backend contract names and retry identity', () => {
  assert.match(source, /submitEnquiry\(kind, data, key\)/);
  assert.match(source, /const \[key\] = useState\(newKey\)/);
  for (const field of ['eventType', 'eventDate', 'guestCount', 'budgetRange', 'contributionRange', 'resources', 'consentVersion']) assert.match(source, new RegExp(field));
  assert.doesNotMatch(source, /<form[^>]+action=/);
});

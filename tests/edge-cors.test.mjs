import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../supabase/functions/', import.meta.url);
const browserFunctions = ['admin-overview', 'admin-settings', 'catalogue-image-upload', 'create-order', 'initialize-paystack-payment', 'quote-box', 'reconcile-refund', 'request-refund', 'submit-enquiry', 'transition-order', 'update-enquiry', 'validate-delivery', 'verify-paystack-payment'];
const nonBrowserFunctions = ['notification-provider-webhook', 'paystack-webhook', 'process-notifications'];

test('browser Edge Functions accept the Supabase client preflight contract', async () => {
  for (const name of browserFunctions) {
    const source = await readFile(new URL(`${name}/index.ts`, root), 'utf8');
    assert.match(source, /Access-Control-Allow-Headers[^\n]*(authorization|Authorization)/, name);
    assert.match(source, /Access-Control-Allow-Headers[^\n]*apikey/, name);
    assert.match(source, /Access-Control-Allow-Headers[^\n]*content-type/, name);
    assert.match(source, /Access-Control-Allow-Headers[^\n]*x-client-info/, name);
    assert.match(source, /OPTIONS/, name);
  }
});

test('provider webhooks and workers remain outside browser CORS handling', async () => {
  for (const name of nonBrowserFunctions) {
    const source = await readFile(new URL(`${name}/index.ts`, root), 'utf8');
    assert.doesNotMatch(source, /Access-Control-Allow-Origin/);
  }
});

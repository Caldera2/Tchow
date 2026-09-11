import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCartDraft, normalizeCartItem } from '../src/hooks/useCart.js';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('cart normalization keeps kobo prices and note variants separate', () => {
  const plain = normalizeCartItem({ id: 'p-1', name: 'Breakfast', price_kobo: 650000 });
  const noteA = normalizeCartItem({ id: 'p-1', name: 'Breakfast', price_kobo: 650000 }, 'No pepper');
  const noteB = normalizeCartItem({ id: 'p-1', name: 'Breakfast', price_kobo: 650000 }, 'Extra sauce');
  assert.equal(plain.productId, 'p-1');
  assert.equal(plain.priceKobo, 650000);
  assert.equal(plain.price, 6500);
  assert.notEqual(noteA.id, noteB.id);
  assert.equal(noteA.notes, 'No pepper');
});

test('malformed drafts and invalid quantities are discarded safely', () => {
  const draft = normalizeCartDraft({
    good: { item: { id: 'p-1', name: 'Valid', price_kobo: 1000 }, quantity: 2 },
    badQuantity: { item: { id: 'p-2', price_kobo: 1000 }, quantity: 0 },
    tooLarge: { item: { id: 'p-3', price_kobo: 1000 }, quantity: 51 },
    malformed: 'not an entry',
  });
  assert.deepEqual(Object.keys(draft), ['p-1::']);
  assert.equal(draft['p-1::'].quantity, 2);
});

test('purchase screens expose shared cart actions and server product identifiers', async () => {
  const menu = await read('src/catalogue/CataloguePages.jsx');
  const home = await read('src/home/DatabaseHome.jsx');
  const app = await read('src/App.jsx');
  const checkout = await read('src/orders/DatabaseCheckout.jsx');
  assert.match(menu, /normalizeCartItem/);
  assert.match(menu, /Quantity/);
  assert.match(menu, /Optional notes/);
  assert.match(home, /normalizeCartItem/);
  assert.match(app, /DatabaseMenu add={addToCart}/);
  assert.match(app, /<Route path="\/menu\/:productId" element=\{<DatabaseProductRoute add=\{addToCart\} \/>\}/);
  assert.match(app, /function DatabaseProductRoute\(\{ add \}\)/);
  assert.match(checkout, /item.productId \|\| item.id/);
});

test('checkout requires an authoritative quote and stores only recovery identifiers', async () => {
  const checkout = await read('src/orders/DatabaseCheckout.jsx');
  const delivery = await read('supabase/functions/validate-delivery/index.ts');
  assert.match(checkout, /serverPricing/);
  assert.match(checkout, /Confirm revised total/);
  assert.match(checkout, /!quoteReady/);
  assert.match(checkout, /orderId: result\.order\.id/);
  assert.doesNotMatch(checkout, /JSON\.stringify\(\{ number: result\.order/);
  assert.match(delivery, /price_kobo/);
  assert.match(delivery, /new Set\(body\.productIds\)/);
});

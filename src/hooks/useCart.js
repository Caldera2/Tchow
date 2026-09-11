import { useEffect, useState } from 'react';
import { storage } from '../utils/storage.js';

const CART_KEY = 'tchow-cart';
const MAX_QUANTITY = 50;

export function normalizeCartItem(product, notes = '') {
  if (!product || typeof product !== 'object') return null;
  const productId = product.productId || (product.boxQuoteId ? null : product.id);
  const rawKobo = product.priceKobo ?? product.price_kobo;
  const parsedKobo = Number(rawKobo);
  const parsedPrice = Number(product.price);
  const priceKobo = Number.isFinite(parsedKobo) ? Math.round(parsedKobo) : Number.isFinite(parsedPrice) ? Math.round(parsedPrice * 100) : null;
  if ((!productId && !product.boxQuoteId) || priceKobo === null || priceKobo < 0) return null;
  const note = String(notes || product.notes || '').trim();
  const baseId = product.boxQuoteId || productId || product.id;
  return { ...product, id: `${baseId}::${note}`, productId, priceKobo, price: priceKobo / 100, notes: note, available: product.available !== false && product.is_available !== false };
}

export function normalizeCartDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return {};
  return Object.values(draft).reduce((result, entry) => {
    const quantity = Number(entry?.quantity);
    const item = normalizeCartItem(entry?.item, entry?.item?.notes);
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return result;
    result[item.id] = { item, quantity };
    return result;
  }, {});
}

export function reconcileCartWithSnapshot(cart, snapshot) {
  const purchased = Array.isArray(snapshot?.items) ? snapshot.items : [];
  if (!purchased.length) return cart;
  const remaining = { ...cart };
  purchased.forEach((entry) => {
    const baseId = entry.boxQuoteId || entry.productId;
    if (!baseId) return;
    const note = String(entry.notes || '').trim();
    const key = `${baseId}::${note}`;
    const current = remaining[key];
    const quantity = Number(entry.quantity);
    if (!current || !Number.isInteger(quantity) || quantity < 1) return;
    if (current.quantity <= quantity) delete remaining[key];
    else remaining[key] = { ...current, quantity: current.quantity - quantity };
  });
  return remaining;
}

const readCart = () => normalizeCartDraft(storage.get(CART_KEY, {}));

export function useCart() {
  const [cart, setCart] = useState(readCart);
  useEffect(() => { storage.set(CART_KEY, cart); }, [cart]);
  useEffect(() => { const sync = (event) => setCart(event?.detail?.snapshot ? (current) => reconcileCartWithSnapshot(current, event.detail.snapshot) : readCart()); window.addEventListener('storage', sync); window.addEventListener('tchow-cart-updated', sync); window.addEventListener('tchow-payment-confirmed', sync); return () => { window.removeEventListener('storage', sync); window.removeEventListener('tchow-cart-updated', sync); window.removeEventListener('tchow-payment-confirmed', sync); }; }, []);

  const add = (product, quantity = 1) => {
    const item = normalizeCartItem(product, product?.notes);
    const amount = Number(quantity);
    if (!item || item.available === false || !Number.isInteger(amount) || amount < 1) return;
    setCart((current) => {
      const existing = current[item.id];
      return { ...current, [item.id]: { item, quantity: Math.min(MAX_QUANTITY, (existing?.quantity || 0) + amount) } };
    });
  };

  const update = (id, quantity) => setCart((current) => {
    const next = { ...current };
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount <= 0) delete next[id];
    else if (next[id]) next[id] = { ...next[id], quantity: Math.min(MAX_QUANTITY, amount) };
    return next;
  });

  const entries = Object.values(cart);
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  return { cart, add, update, count, subtotal };
}

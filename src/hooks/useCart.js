import { useEffect, useState } from 'react';
import { storage } from '../utils/storage';

const readCart = () => storage.get('tchow-cart', {});

export function useCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    storage.set('tchow-cart', cart);
  }, [cart]);

  const add = (item, quantity = 1) => setCart((current) => ({
    ...current,
    [item.id]: { item, quantity: (current[item.id]?.quantity || 0) + quantity },
  }));

  const update = (id, quantity) => setCart((current) => {
    const next = { ...current };
    if (!quantity) delete next[id];
    else next[id] = { ...next[id], quantity };
    return next;
  });

  const count = Object.values(cart).reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = Object.values(cart).reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);

  return { cart, add, update, count, subtotal };
}

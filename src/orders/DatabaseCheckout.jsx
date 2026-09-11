import { useEffect, useState } from 'react';
import { createOrder } from '../services/orders';
import { listDeliveryOptions, quoteDelivery } from '../services/delivery';
import { initializePayment } from '../services/payments';

const paymentEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
const money = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export function DatabaseCheckout({ cart }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', area: '', city: '', state: '', serviceAreaId: '', slotId: '', deliveryDate: '', instructions: '', agree: false });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]); const [deliveryError, setDeliveryError] = useState('');
  const [deliveryQuote, setDeliveryQuote] = useState(null); const [serverPricing, setServerPricing] = useState(null); const [priceConfirmed, setPriceConfirmed] = useState(false);
  const entries = Object.values(cart); const empty = entries.length === 0;
  const localSubtotalKobo = entries.reduce((sum, entry) => sum + Number(entry.item.priceKobo || 0) * entry.quantity, 0);
  const selectedArea = deliveryOptions.find((area) => area.id === form.serviceAreaId);
  const selectedZone = selectedArea?.delivery_zones?.find((zone) => zone.delivery_time_slots?.some((slot) => slot.id === form.slotId));
  const slots = selectedArea?.delivery_zones?.flatMap((zone) => zone.delivery_time_slots || []) || [];
  const quoteReady = Boolean(deliveryQuote && serverPricing);
  const pricingChanged = Boolean(serverPricing?.changed);
  const displaySubtotal = serverPricing?.subtotalKobo ?? localSubtotalKobo;
  const displayDelivery = serverPricing?.deliveryFeeKobo ?? 0;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectArea = (value) => { const area = deliveryOptions.find((item) => item.id === value); setForm((current) => ({ ...current, serviceAreaId: value, area: area?.name || '', city: area?.delivery_cities?.name || '', state: area?.delivery_cities?.delivery_states?.name || '', slotId: '', deliveryDate: '' })); setDeliveryQuote(null); setServerPricing(null); setPriceConfirmed(false); setDeliveryError(''); };

  useEffect(() => { listDeliveryOptions().then(setDeliveryOptions).catch(() => setDeliveryError('Delivery is not configured for this checkout yet.')); }, []);
  useEffect(() => {
    let active = true; setDeliveryQuote(null); setServerPricing(null); setPriceConfirmed(false); setDeliveryError('');
    if (!form.serviceAreaId || !form.slotId || !form.deliveryDate || empty) return undefined;
    quoteDelivery({ serviceAreaId: form.serviceAreaId, slotId: form.slotId, deliveryDate: form.deliveryDate, productIds: entries.flatMap(({ item }) => item.boxQuoteId ? [] : [item.productId || item.id]) }).then((result) => {
      if (!active) return;
      const products = result.products || []; const pricedEntries = entries.map(({ item, quantity }) => { const product = products.find((candidate) => candidate.id === item.productId); return { item, quantity, priceKobo: product?.price_kobo ?? item.priceKobo }; });
      const subtotalKobo = pricedEntries.reduce((sum, entry) => sum + Number(entry.priceKobo || 0) * entry.quantity, 0); const deliveryFeeKobo = Number(result.quote?.feeKobo || 0);
      const changed = pricedEntries.some((entry) => entry.item.priceKobo !== entry.priceKobo) || deliveryFeeKobo !== Number(selectedZone?.fee_kobo || deliveryFeeKobo);
      setDeliveryQuote(result.quote || null); setServerPricing({ products, subtotalKobo, deliveryFeeKobo, totalKobo: subtotalKobo + deliveryFeeKobo, changed });
    }).catch(() => { if (active) setDeliveryError('This delivery date or slot is not currently available.'); });
    return () => { active = false; };
  }, [form.serviceAreaId, form.slotId, form.deliveryDate, entries.map(({ item, quantity }) => `${item.id}:${quantity}`).join(','), empty]);

  const submit = async (event) => {
    event.preventDefault();
    if (empty) { setError('Your cart is empty. Add an item before checkout.'); return; }
    if (!paymentEnabled) { setError('Paystack test checkout is not enabled in this environment.'); return; }
    if (!form.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.phone || !form.address || !form.serviceAreaId || !form.slotId || !form.deliveryDate || !form.agree || !quoteReady) { setError('Please complete your contact, configured delivery selection, and confirmation details.'); return; }
    if (pricingChanged && !priceConfirmed) { setError('Review and confirm the revised total before continuing to Paystack.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { customer: { name: form.name, email: form.email, phone: form.phone }, delivery: { address: form.address, area: form.area, city: form.city, state: form.state, serviceAreaId: form.serviceAreaId, slotId: form.slotId, deliveryDate: form.deliveryDate, instructions: form.instructions }, items: entries.map(({ item, quantity }) => ({ productId: item.boxQuoteId ? undefined : item.productId || item.id, boxQuoteId: item.boxQuoteId, quantity, notes: item.notes })) };
      const requestFingerprint = JSON.stringify(payload); let storedAttempt = null; try { storedAttempt = JSON.parse(localStorage.getItem('tchow-checkout-attempt') || 'null'); } catch { storedAttempt = null; }
      const idempotencyKey = storedAttempt?.fingerprint === requestFingerprint ? storedAttempt.key : crypto.randomUUID(); localStorage.setItem('tchow-checkout-attempt', JSON.stringify({ key: idempotencyKey, fingerprint: requestFingerprint }));
      const result = await createOrder({ ...payload, idempotencyKey }); localStorage.setItem('tchow-last-order', JSON.stringify({ orderId: result.order.id, orderNumber: result.order.order_number }));
      const payment = await initializePayment(result.order.id); if (!payment?.checkoutUrl) throw new Error('Paystack did not return a checkout link.'); window.location.assign(payment.checkoutUrl);
    } catch (submitError) { setError(submitError.message || 'We could not start payment yet. Your checkout attempt is still available to retry.'); } finally { setBusy(false); }
  };

  return <main className="page checkout-page"><div className="intro"><span className="eyebrow">Checkout</span><h1>Let’s get this to your table.</h1><p>Review the server-calculated total, then continue to the configured Paystack test checkout.</p></div><form className="checkout-layout" onSubmit={submit} noValidate><section className="form-card"><span className="eyebrow">Contact and delivery details</span><div className="form-grid">{[['name','Full name'],['email','Email address'],['phone','Phone number']].map(([key,label]) => <label key={key}>{label}<input required type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}<label>Service area<select required value={form.serviceAreaId || ''} onChange={(event) => selectArea(event.target.value)}><option value="">{deliveryOptions.length ? 'Select configured area' : 'No areas configured'}</option>{deliveryOptions.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>{form.city && <p className="summary-note">{form.city}, {form.state}</p>}<label>Delivery date<input required type="date" value={form.deliveryDate || ''} onChange={(event) => { update('deliveryDate', event.target.value); setDeliveryError(''); }} /></label><label>Time slot<select required value={form.slotId || ''} onChange={(event) => { update('slotId', event.target.value); setDeliveryError(''); }}><option value="">Select a slot</option>{slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.name}</option>)}</select></label><label className="span-2">Address<textarea required rows="3" value={form.address} onChange={(event) => update('address', event.target.value)} /></label><label className="span-2">Delivery instructions <span className="optional">Optional</span><textarea rows="3" value={form.instructions} onChange={(event) => update('instructions', event.target.value)} /></label></div><div className="payment-options"><button type="button" disabled={empty || !paymentEnabled}>Paystack test checkout <small>{paymentEnabled ? 'Available next' : 'Not configured'}</small></button><button type="button" disabled>Bank transfer <small>Unavailable</small></button></div>{pricingChanged && <div className="summary-note" role="status"><strong>Updated total</strong><p>The catalogue or delivery fee changed. Confirm the revised breakdown before continuing.</p><button type="button" className="button button-outline" onClick={() => { setPriceConfirmed(true); setError(''); }}>Confirm revised total: {money(serverPricing.totalKobo)}</button></div>}{deliveryError && <p className="form-error" role="alert">{deliveryError}</p>}{error && <p className="form-error" role="alert">{error}</p>}<label className="checkbox"><input type="checkbox" checked={form.agree} onChange={(event) => update('agree', event.target.checked)} /> I confirm that these order details are correct.</label><button className="button button-primary" type="submit" disabled={busy || empty || !quoteReady || (pricingChanged && !priceConfirmed) || !paymentEnabled}>{busy ? 'Opening Paystack...' : paymentEnabled ? 'Review and pay with Paystack' : 'Payment unavailable in this environment'}</button></section><aside className="order-summary"><span className="eyebrow">Server-calculated summary</span>{entries.map(({ item, quantity }) => { const quoted = serverPricing?.products?.find((product) => product.id === item.productId); const price = quoted?.price_kobo ?? item.priceKobo; return <div className="mini-line" key={item.id}><span>{quantity} × {item.name}</span><strong>{money(price * quantity)}</strong></div>; })}<div><span>Subtotal</span><strong>{money(displaySubtotal)}</strong></div><div><span>Delivery fee</span><strong>{quoteReady ? money(displayDelivery) : 'Select area and slot'}</strong></div><hr /><div className="summary-grand"><span>Total</span><strong>{quoteReady ? money(displaySubtotal + displayDelivery) : 'Pending quote'}</strong></div></aside></form></main>;
}

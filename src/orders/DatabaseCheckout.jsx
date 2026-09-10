import { useEffect, useState } from 'react';
import { createOrder } from '../services/orders';
import { listDeliveryOptions } from '../services/delivery';
import { initializePayment } from '../services/payments';

export function DatabaseCheckout({ cart }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', area: '', city: 'Lagos', state: 'Lagos', instructions: '', agree: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [deliveryError, setDeliveryError] = useState('');
  const entries = Object.values(cart);
  const subtotal = entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const selectedArea = deliveryOptions.find((area) => area.id === form.serviceAreaId);
  const selectedZone = selectedArea?.delivery_zones?.[0];
  const deliveryFee = selectedZone?.fee_kobo ? selectedZone.fee_kobo / 100 : 0;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => { listDeliveryOptions().then(setDeliveryOptions).catch(() => setDeliveryError('Delivery is not configured for this checkout yet.')); }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.address || !form.area || !form.city || !form.state || !form.agree) { setError('Please complete your contact, delivery and confirmation details.'); return; }
    setBusy(true); setError('');
    try {
      const result = await createOrder({ idempotencyKey: crypto.randomUUID(), customer: { name: form.name, email: form.email, phone: form.phone, address: form.address, area: form.area, city: form.city, state: form.state, instructions: form.instructions }, items: entries.map(({ item, quantity }) => ({ productId: item.boxQuoteId ? undefined : item.id, boxQuoteId: item.boxQuoteId, quantity, notes: item.notes })) });
      localStorage.setItem('tchow-last-order', JSON.stringify({ number: result.order.order_number, ...form, subtotal: result.order.subtotal_kobo / 100, deliveryFee: result.order.delivery_fee_kobo / 100, total: result.order.total_kobo / 100, items: entries, status: result.order.status, orderId: result.order.id }));
      const payment = await initializePayment(result.order.id);
      window.location.assign(payment.checkoutUrl);
    } catch (submitError) { setError(submitError.message || 'We could not place the order yet. Please try again.'); } finally { setBusy(false); }
  };
  return <main className="page checkout-page"><div className="intro"><span className="eyebrow">Checkout</span><h1>Let’s get this to your table.</h1><p>Review your details before requesting order confirmation. Payment is not collected here.</p></div><form className="checkout-layout" onSubmit={submit} noValidate><section className="form-card"><span className="eyebrow">Contact and delivery details</span><div className="form-grid">{[['name','Full name'],['email','Email address'],['phone','Phone number']].map(([key,label]) => <label key={key}>{label}<input required type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}<label>Service area<select required value={form.serviceAreaId || ''} onChange={(event) => update('serviceAreaId', event.target.value)}><option value="">{deliveryOptions.length ? 'Select configured area' : 'No areas configured'}</option>{deliveryOptions.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Delivery date<input required type="date" value={form.deliveryDate || ''} onChange={(event) => update('deliveryDate', event.target.value)} /></label><label>Time slot<select required value={form.slotId || ''} onChange={(event) => update('slotId', event.target.value)}><option value="">Select a slot</option>{(selectedArea?.delivery_time_slots || []).map((slot) => <option key={slot.id} value={slot.id}>{slot.name}</option>)}</select></label><label className="span-2">Address<textarea required rows="3" value={form.address} onChange={(event) => update('address', event.target.value)} /></label><label className="span-2">Delivery instructions <span className="optional">Optional</span><textarea rows="3" value={form.instructions} onChange={(event) => update('instructions', event.target.value)} /></label></div><div className="payment-options"><button type="button" disabled>Paystack <small>Coming soon</small></button><button type="button" disabled>Bank transfer <small>Coming soon</small></button></div>{deliveryError && <p className="form-error" role="alert">{deliveryError}</p>}{error && <p className="form-error" role="alert">{error}</p>}<label className="checkbox"><input type="checkbox" checked={form.agree} onChange={(event) => update('agree', event.target.checked)} /> I confirm that these order details are correct.</label><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Continue to order confirmation'}</button></section><aside className="order-summary"><span className="eyebrow">Order summary</span>{entries.map(({ item, quantity }) => <div className="mini-line" key={item.id}><span>{quantity} × {item.name}</span><strong>₦{(item.price * quantity).toLocaleString('en-NG')}</strong></div>)}<div><span>Subtotal</span><strong>₦{subtotal.toLocaleString('en-NG')}</strong></div><div><span>Estimated delivery fee</span><strong>₦{deliveryFee.toLocaleString('en-NG')}</strong></div><hr /><div className="summary-grand"><span>Total</span><strong>₦{(subtotal + deliveryFee).toLocaleString('en-NG')}</strong></div></aside></form></main>;
}

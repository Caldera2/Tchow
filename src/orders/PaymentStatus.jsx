import { useEffect, useState } from 'react';
import { verifyPayment } from '../services/payments';
import { reconcileCartWithSnapshot } from '../hooks/useCart';

const RECONCILED_PAYMENTS_KEY = 'tchow-reconciled-payments';

function claimCartReconciliation(reference) {
  try {
    const previous = JSON.parse(localStorage.getItem(RECONCILED_PAYMENTS_KEY) || '[]');
    const processed = Array.isArray(previous) ? previous.filter((item) => typeof item === 'string') : [];
    if (processed.includes(reference)) return false;
    localStorage.setItem(RECONCILED_PAYMENTS_KEY, JSON.stringify([...processed, reference].slice(-100)));
  } catch {
    // Cart reconciliation remains best effort when browser storage is unavailable.
  }
  return true;
}

export function PaymentStatus() {
  const reference = new URLSearchParams(location.search).get('reference') || '';
  const [state, setState] = useState({ loading: true, kind: 'checking', message: 'Checking payment status…', attempts: 0 });
  useEffect(() => {
    if (!reference) { setState({ loading: false, kind: 'error', message: 'No payment reference was provided.', attempts: 0 }); return undefined; }
    let active = true; let timer; let attempts = 0; const maxAttempts = 12;
    const check = async () => { attempts += 1; try { const result = await verifyPayment(reference); if (!active) return; const payment = result.payment || {}; const confirmed = ['paid', 'partially_refunded', 'refunded'].includes(payment.outcome) || (payment.duplicate && ['paid', 'partially_refunded', 'refunded'].includes(payment.paymentStatus)); if (confirmed) { try { localStorage.removeItem('tchow-checkout-attempt'); } catch { /* storage may be disabled */ } if (result.orderSnapshot && claimCartReconciliation(reference)) window.dispatchEvent(new CustomEvent('tchow-payment-confirmed', { detail: { snapshot: result.orderSnapshot, reconciliationKey: reference } })); const kind = payment.paymentStatus === 'refunded' || payment.outcome === 'refunded' ? 'refunded' : payment.paymentStatus === 'partially_refunded' || payment.outcome === 'partially_refunded' ? 'partially_refunded' : 'paid'; setState({ loading: false, kind, message: kind === 'paid' ? 'Payment verified. Your order is now being reviewed.' : kind === 'refunded' ? 'Payment verified. This order has been fully refunded.' : 'Payment verified. This order has been partially refunded.', attempts }); } else if (payment.outcome === 'failed') setState({ loading: false, kind: 'failed', message: 'Paystack reported that this payment failed. You can retry from checkout.', attempts }); else if (payment.outcome === 'abandoned') setState({ loading: false, kind: 'abandoned', message: 'This payment was abandoned before completion. You can retry from checkout.', attempts }); else if (payment.outcome === 'exception') setState({ loading: false, kind: 'exception', message: payment.reason === 'second_successful_payment' ? 'A second successful payment needs manual review. No duplicate fulfilment was created.' : 'This payment needs manual review before the order can proceed.', attempts }); else if (attempts >= maxAttempts) setState({ loading: false, kind: 'pending', message: 'Payment is still pending. Retry verification later or contact Tchow support.', attempts }); else { setState({ loading: true, kind: 'pending', message: 'Payment is still pending. Checking again shortly…', attempts }); timer = setTimeout(check, 5000); } } catch { if (active && attempts >= maxAttempts) setState({ loading: false, kind: 'pending', message: 'Verification timed out. Retry verification or contact Tchow support.', attempts }); else if (active) { setState({ loading: true, kind: 'pending', message: 'Verification is still pending. Checking again shortly…', attempts }); timer = setTimeout(check, 5000); } } };
    check();
    return () => { active = false; clearTimeout(timer); };
  }, [reference]);
  return <main className="page"><div className="intro"><span className="eyebrow">Payment status</span><h1>{state.loading ? 'We are checking your payment.' : 'Payment update'}</h1><p>{state.message}</p>{state.loading && <p className="summary-note">Verification attempt {state.attempts} of 12.</p>}{!state.loading && state.kind !== 'paid' && <p><a className="button button-outline" href="/checkout">Retry payment</a> <a className="text-link" href="/contact">Contact support</a></p>}<p className="summary-note">Payment status is confirmed only by the server. Do not rely on a browser callback alone.</p></div></main>;
}

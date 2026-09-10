import { useEffect, useState } from 'react';
import { verifyPayment } from '../services/payments';

export function PaymentStatus() {
  const reference = new URLSearchParams(location.search).get('reference') || '';
  const [state, setState] = useState({ loading: true, message: 'Checking payment status…' });
  useEffect(() => {
    if (!reference) { setState({ loading: false, message: 'No payment reference was provided.' }); return undefined; }
    let active = true; let timer;
    const check = async () => { try { const result = await verifyPayment(reference); if (!active) return; if (result.providerStatus === 'success' || result.payment?.accepted) setState({ loading: false, message: 'Payment status recorded. Your order is now being reviewed.' }); else { setState({ loading: true, message: 'Payment is still pending. Checking again shortly…' }); timer = setTimeout(check, 5000); } } catch { if (active) { setState({ loading: true, message: 'Payment verification is still pending. Checking again shortly…' }); timer = setTimeout(check, 5000); } } };
    check();
    return () => { active = false; clearTimeout(timer); };
  }, [reference]);
  return <main className="page"><div className="intro"><span className="eyebrow">Payment status</span><h1>{state.loading ? 'We are checking your payment.' : 'Payment update'}</h1><p>{state.message}</p><p className="summary-note">Payment status is confirmed only by the server. Do not rely on a browser callback alone.</p></div></main>;
}

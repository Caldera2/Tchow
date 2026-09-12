import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { formatNaira } from '../components';
import { orderRepository } from '../services/repositories';

export function DatabaseOrderConfirmation() {
  const location = useLocation(); const params = useParams();
  const [order, setOrder] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { const queryId = new URLSearchParams(location.search).get('orderId'); const pathId = params.orderId || (location.pathname.startsWith('/account/orders/') ? location.pathname.split('/').pop() : null); const id = queryId || pathId; setLoading(true); setError(''); if (!id) { setError('This confirmation link does not include an order.'); setLoading(false); return undefined; } orderRepository.get(id).then(setOrder).catch(() => setError('We could not load this order. Please sign in and open it from your account.')).finally(() => setLoading(false)); return undefined; }, [location.pathname, location.search, params.orderId]);
  if (loading) return <main className="page confirmation-page"><div className="success-card"><p>Loading your order confirmation...</p></div></main>;
  if (error || !order) return <main className="page confirmation-page"><div className="success-card"><h1>Confirmation unavailable</h1><p role="alert">{error || 'This order is not available.'}</p><Link className="button button-primary" to="/account/orders">View account orders</Link></div></main>;
  let deliverySnapshot = order.delivery_address_snapshot || {};
  if (typeof deliverySnapshot === 'string') { try { deliverySnapshot = JSON.parse(deliverySnapshot); } catch { deliverySnapshot = {}; } }
  const deliveryName = order.customer_name || deliverySnapshot.name || 'Your account';
  const deliveryArea = deliverySnapshot.area || deliverySnapshot.city || deliverySnapshot.state || 'To be confirmed';
  return <main className="page confirmation-page"><div className="confirmation-card"><div className="confirmation-icon"><Check size={30} /></div><span className="eyebrow">Order {order.order_number || order.id}</span><h1>We have your order details.</h1><p className="confirmation-lead">Your order status is <strong>{String(order.status || 'received_for_review').replaceAll('_', ' ')}</strong>.</p><div className="confirmation-facts"><div><span>Customer</span><strong>{deliveryName}</strong></div><div><span>Delivery area</span><strong>{deliveryArea}</strong></div><div><span>Estimated preparation</span><strong>Shown in your order details</strong></div></div><div className="confirmation-order"><div className="confirmation-order-head"><span className="eyebrow">Order summary</span><strong>{formatNaira((order.total_kobo || 0) / 100)}</strong></div>{(order.order_items || []).map((item) => <div className="mini-line" key={item.id}><span>{item.quantity} × {item.product_name_snapshot || item.product_name || item.name}</span><strong>{formatNaira((item.line_total_kobo || item.unit_price_kobo * item.quantity || 0) / 100)}</strong></div>)}</div><div className="preview-note"><p>This page displays the server-authorized order record. Payment and fulfilment status are updated only by their respective backend workflows.</p></div><div className="hero-buttons"><Link className="button button-primary" to="/menu">Return to menu</Link><Link className="button button-outline" to="/account/orders">View account orders</Link></div></div></main>;
}

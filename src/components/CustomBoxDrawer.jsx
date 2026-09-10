import React from 'react';
import { ShoppingBag, X, Plus, Minus, MessageSquare, Copy } from 'lucide-react';

export default function CustomBoxDrawer({ 
  isOpen, 
  onClose, 
  cart, 
  onUpdateQty, 
  onShowToast 
}) {
  const cartItems = Object.values(cart);
  const totalAmount = cartItems.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);

  const handleWhatsAppCheckout = () => {
    if (cartItems.length === 0) {
      onShowToast('Please add items to your custom box first.');
      return;
    }

    let message = `*🌟 TCHOW BESPOKE BOX ORDER INQUIRY*\n\n`;
    cartItems.forEach((ci, idx) => {
      message += `${idx + 1}. *${ci.item.name}* x${ci.quantity} — ₦${(ci.item.price * ci.quantity).toLocaleString()}\n`;
    });
    message += `\n*Estimated Total:* ₦${totalAmount.toLocaleString()}\n`;
    message += `\nHello Tchow Concierge! I'd like to confirm this order schedule and provide my delivery location.`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/2348123456789?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopySummary = () => {
    if (cartItems.length === 0) {
      onShowToast('Your bespoke box is currently empty.');
      return;
    }

    let text = `TCHOW BESPOKE BOX SUMMARY\n`;
    text += `====================================\n`;
    cartItems.forEach(ci => {
      text += `• ${ci.item.name} x${ci.quantity} : ₦${(ci.item.price * ci.quantity).toLocaleString()}\n`;
    });
    text += `====================================\n`;
    text += `Estimated Total: ₦${totalAmount.toLocaleString()}\n`;

    navigator.clipboard.writeText(text).then(() => {
      onShowToast('📋 Summary copied to clipboard');
    });
  };

  return (
    <div className={`drawer-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="drawer-slider">
        <div className="drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={18} className="gold-text" />
            <h3>Your Bespoke Box</h3>
          </div>
          <button className="drawer-head-close" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content-scroll">
          {cartItems.length === 0 ? (
            <div className="drawer-empty-view">
              <ShoppingBag size={42} strokeWidth={1.5} />
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.4rem', fontSize: '1rem' }}>No Items Selected</h4>
              <p style={{ fontSize: '0.84rem' }}>Select banana pancakes, small chops, parfaits, or chilled zobo to begin curating your box.</p>
            </div>
          ) : (
            cartItems.map(({ item, quantity }) => (
              <div key={item.id} className="drawer-item-card">
                <div>
                  <span className="drawer-item-title">{item.name}</span>
                  <span className="drawer-item-price">₦{(item.price * quantity).toLocaleString()}</span>
                </div>
                <div className="drawer-qty-pill">
                  <button 
                    className="qty-stepper-btn" 
                    onClick={() => onUpdateQty(item.id, -1)}
                    aria-label="Decrease"
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button 
                    className="qty-stepper-btn" 
                    onClick={() => onUpdateQty(item.id, 1)}
                    aria-label="Increase"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="drawer-bottom-checkout">
          <div className="checkout-total-row">
            <span>Estimated Total</span>
            <strong>₦{totalAmount.toLocaleString()}</strong>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
            Delivery rates and dietary accommodations confirmed on concierge dispatch.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button className="btn btn-whatsapp btn-full" onClick={handleWhatsAppCheckout}>
              <MessageSquare size={16} /> Confirm on WhatsApp
            </button>
            <button className="btn btn-outline btn-full" onClick={handleCopySummary}>
              <Copy size={14} /> Copy Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

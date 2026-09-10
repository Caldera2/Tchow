import React, { useState, useEffect } from 'react';
import { X, Send, ShieldCheck } from 'lucide-react';

export default function InvestorModal({ isOpen, onClose, defaultTier, onShowToast }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    amount: '₦500k - ₦2M',
    tier: defaultTier || 'Fixed Return Investment',
    notes: ''
  });

  useEffect(() => {
    if (defaultTier) {
      setFormData(prev => ({ ...prev, tier: defaultTier }));
    }
  }, [defaultTier]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onShowToast(`🎉 Thank you, ${formData.name}. Your prospectus application for "${formData.tier}" has been received. Our leadership office will contact you within 24 hours.`);
    onClose();
  };

  return (
    <div className={`modal-backdrop-luxury ${isOpen ? 'open' : ''}`}>
      <div className="modal-luxury-window">
        <div className="modal-luxury-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-primary)', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>
              <ShieldCheck size={14} /> Confidential Partnership Application
            </div>
            <h3>{formData.tier || 'Investor Relations Application'}</h3>
          </div>
          <button className="drawer-head-close" onClick={onClose} aria-label="Close dialog">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid-row">
            <div className="form-field">
              <label>Full Name *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Toyomfonabasi Leo Uttah"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Email Address *</label>
              <input 
                type="email" 
                required 
                placeholder="partner@domain.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-row">
            <div className="form-field">
              <label>Phone / WhatsApp *</label>
              <input 
                type="tel" 
                required 
                placeholder="+234 800 000 0000"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Target Tranche / Capital</label>
              <select 
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              >
                <option value="₦200k - ₦500k">₦200,000 – ₦500,000 (Tier 1)</option>
                <option value="₦500k - ₦2M">₦500,000 – ₦2,000,000 (Tier 2)</option>
                <option value="₦2M - ₦5M">₦2,000,000 – ₦5,000,000 (Tier 3)</option>
                <option value="₦5M+">₦5,000,000+ (Institutional / Strategic)</option>
                <option value="Equipment / Machinery">Commercial Kitchen & Beverage Asset Supply</option>
                <option value="Strategic Advisory">Strategic Advisory & Growth Resources</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Partnership Scope / Notes</label>
            <textarea 
              rows={3} 
              placeholder="Detail your investment horizon or strategic capabilities..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={15} /> Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

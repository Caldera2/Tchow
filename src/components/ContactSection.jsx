import React, { useState } from 'react';
import { UserCheck, Mail, Phone, Clock, Send, MessageCircle } from 'lucide-react';

export default function ContactSection({ onShowToast }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'catering',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onShowToast(`📬 Thank you, ${formData.name}. Your concierge message has been delivered. We will respond promptly.`);
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: 'catering',
      message: ''
    });
  };

  return (
    <section className="section-contact" id="contact">
      <div className="container">
        <div className="contact-columns">
          <div className="contact-concierge-card">
            <span className="section-eyebrow">DIRECT CONCIERGE</span>
            <h2>Direct Communications</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Whether commissioning custom breakfast catering, discussing investor relations, or planning group dining, our executive desk is available.
            </p>

            <div className="concierge-list">
              <div className="concierge-item">
                <UserCheck size={18} />
                <div>
                  <strong>Founder & Executive Desk</strong>
                  <span>Toyomfonabasi Leo Uttah</span>
                </div>
              </div>

              <div className="concierge-item">
                <Mail size={18} />
                <div>
                  <strong>Official Channels</strong>
                  <span>
                    <a href="mailto:hello@tchow.com">hello@tchow.com</a> • <a href="mailto:invest@tchow.com">invest@tchow.com</a>
                  </span>
                </div>
              </div>

              <div className="concierge-item">
                <Phone size={18} />
                <div>
                  <strong>Phone & WhatsApp Hotline</strong>
                  <span>+234 812 345 6789</span>
                </div>
              </div>

              <div className="concierge-item">
                <Clock size={18} />
                <div>
                  <strong>Operating Dispatch Hours</strong>
                  <span>Monday – Sunday: 7:00 AM – 9:00 PM</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
              <a href="#" className="box-trigger-btn" aria-label="WhatsApp Concierge">
                <MessageCircle size={16} /> WhatsApp Hotline
              </a>
            </div>
          </div>

          <div className="contact-form-panel">
            <h3>Send a Direct Brief</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Your Full Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Alex Adewale"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-grid-row">
                <div className="form-field">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="alex@domain.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Phone / WhatsApp</label>
                  <input 
                    type="tel" 
                    placeholder="+234..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Nature of Inquiry</label>
                <select 
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                >
                  <option value="catering">Corporate Breakfast & Event Catering</option>
                  <option value="order">Custom Bespoke Box Order</option>
                  <option value="investment">Investor Partnership Inquiry</option>
                  <option value="press">Press & Brand Collaboration</option>
                </select>
              </div>

              <div className="form-field">
                <label>Message / Specifications *</label>
                <textarea 
                  rows={4} 
                  required 
                  placeholder="Outline your requirements, guest count, or investment objectives..."
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                <Send size={15} /> Dispatch Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

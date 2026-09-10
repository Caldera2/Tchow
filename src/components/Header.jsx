import React, { useState } from 'react';
import { ShoppingBag, Menu, X, ArrowRight } from 'lucide-react';

export default function Header({ cartCount, onOpenCart, onOpenInvestorModal }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="site-nav">
        <div className="container nav-inner">
          <a href="#" className="brand-mark" aria-label="Tchow Home">
            <span className="brand-title">TCHOW</span>
            <span className="brand-dot">•</span>
          </a>

          <div className="nav-links">
            <a href="#about" className="nav-link">Manifesto</a>
            <a href="#menu" className="nav-link">Menu & Portfolio</a>
            <a href="#roadmap" className="nav-link">Growth Strategy</a>
            <a href="#investors" className="nav-link">Investor Relations</a>
            <a href="#catering" className="nav-link">Catering</a>
            <a href="#contact" className="nav-link">Concierge</a>
          </div>

          <div className="nav-actions">
            <button className="box-trigger-btn" onClick={onOpenCart} aria-label="Open Custom Box Drawer">
              <ShoppingBag size={16} />
              <span>Bespoke Box</span>
              <span className="box-badge">{cartCount}</span>
            </button>
            
            <button 
              className="btn btn-primary btn-sm desktop-only"
              onClick={() => onOpenInvestorModal('Strategic Partnership')}
            >
              Partner With Us
            </button>

            <button 
              className="mobile-toggle-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open Mobile Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`drawer-backdrop ${mobileOpen ? 'open' : ''}`}>
        <div className="drawer-slider">
          <div className="drawer-head">
            <span className="brand-title">TCHOW<span className="brand-dot">•</span></span>
            <button className="drawer-head-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={24} />
            </button>
          </div>

          <div className="drawer-content-scroll" style={{ gap: '1.5rem', paddingTop: '2rem' }}>
            <a href="#about" className="nav-link" style={{ fontSize: '1.1rem' }} onClick={() => setMobileOpen(false)}>Manifesto</a>
            <a href="#menu" className="nav-link" style={{ fontSize: '1.1rem' }} onClick={() => setMobileOpen(false)}>Menu & Portfolio</a>
            <a href="#roadmap" className="nav-link" style={{ fontSize: '1.1rem' }} onClick={() => setMobileOpen(false)}>Growth Strategy</a>
            <a href="#investors" className="nav-link" style={{ fontSize: '1.1rem' }} onClick={() => setMobileOpen(false)}>Investor Relations</a>
            <a href="#catering" className="nav-link" style={{ fontSize: '1.1rem' }} onClick={() => setMobileOpen(false)}>Catering</a>
            <a href="#contact" className="nav-link" style={{ fontSize: '1.1rem' }} onClick={() => setMobileOpen(false)}>Concierge</a>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button 
                className="btn btn-primary btn-full"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenInvestorModal('General Investor Inquiry');
                }}
              >
                Investor Information
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

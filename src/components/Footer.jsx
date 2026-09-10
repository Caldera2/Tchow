import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer-corp">
      <div className="container">
        <div className="footer-nav-grid">
          <div className="footer-brand-summary">
            <span className="brand-title">TCHOW<span className="brand-dot">•</span></span>
            <p>
              The Architecture of Memorable Dining. Quality breakfast collections, artisanal small chops, dessert parfaits, and bespoke catering.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Portfolio</h4>
            <div className="footer-links-list">
              <a href="#menu">Breakfast Collection</a>
              <a href="#menu">Small Chops & Bites</a>
              <a href="#menu">Sweet Treats & Parfaits</a>
              <a href="#menu">Craft Chill Zobo</a>
            </div>
          </div>

          <div>
            <h4 className="footer-col-title">Enterprise</h4>
            <div className="footer-links-list">
              <a href="#about">Brand Manifesto</a>
              <a href="#roadmap">3-Phase Roadmap</a>
              <a href="#catering">Corporate Catering</a>
              <a href="#contact">Direct Concierge</a>
            </div>
          </div>

          <div>
            <h4 className="footer-col-title">Investors</h4>
            <div className="footer-links-list">
              <a href="#investors">Fixed ROI Tranches (25%)</a>
              <a href="#investors">Revenue Share Model</a>
              <a href="#investors">Asset & Equipment Tiers</a>
              <a href="#investors">Investor Information Pack</a>
            </div>
          </div>
        </div>

        <div className="footer-legal-bar">
          <div>
            &copy; {new Date().getFullYear()} Tchow Hospitality Group. All rights reserved. Founder: Toyomfonabasi Leo Uttah.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#">Terms of Engagement</a>
            <a href="#">Privacy Framework</a>
            <a href="#investors">Investor Relations</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

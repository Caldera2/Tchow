import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero({ onOpenInvestorModal }) {
  return (
    <section className="hero-wrapper" id="hero" style={{ borderBottom: 'none' }}>
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text-side">
            <div className="hero-tag">
              <Sparkles size={13} />
              <span>Modern Culinary Lifestyle</span>
            </div>

            <h1 className="hero-main-title">
              The Architecture of <span className="gold-gradient-text">Memorable Dining</span>.
            </h1>

            <p className="hero-lead-text">
              Tchow crafts moments of warmth, quality, and connection through artisanal pancake breakfast collections, gourmet Nigerian small chops, layered parfaits, and botanical chill zobo.
            </p>

            <div className="hero-actions">
              <a href="#menu" className="btn btn-primary btn-lg">
                Explore Menu <ArrowRight size={16} />
              </a>
              <button 
                className="btn btn-outline btn-lg"
                onClick={() => onOpenInvestorModal('Investor Prospectus')}
              >
                Investor Relations
              </button>
            </div>

            <div className="hero-metrics">
              <div className="metric-box">
                <span className="metric-num">100%</span>
                <span className="metric-label">Made To Order</span>
              </div>
              <div className="metric-box">
                <span className="metric-num">5+</span>
                <span className="metric-label">Culinary Lines</span>
              </div>
              <div className="metric-box">
                <span className="metric-num">Phase 1</span>
                <span className="metric-label">Online Scale Active</span>
              </div>
            </div>
          </div>

          <div className="hero-visual-side">
            <div className="hero-visual-frame">
              <img 
                src="/assets/hero.jpg" 
                alt="Tchow Culinary Spread" 
                className="hero-image" 
              />
              <div className="hero-badge-overlay">
                <strong>Artisanal Small Chops & Gourmet Breakfast</strong>
                <span>Experience-driven everyday dining</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

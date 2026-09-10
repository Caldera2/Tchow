import React from 'react';
import { Check, PackagePlus, ArrowRight } from 'lucide-react';

export default function CateringSection({ onOpenCustomizer }) {
  return (
    <section className="section-catering" id="catering">
      <div className="container">
        <div className="catering-briefing-card">
          <div className="catering-content">
            <span className="section-eyebrow">CORPORATE & PRIVATE EVENTS</span>
            <h2>Bespoke Food Packages & Event Catering</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
              From executive breakfast meetings and brand launches to social brunches and private celebrations, Tchow delivers customized gourmet boxes and live catering stations with flawless execution.
            </p>

            <ul className="catering-points">
              <li>
                <Check size={16} />
                <span>Custom branded packaging with your corporate or event emblem</span>
              </li>
              <li>
                <Check size={16} />
                <span>Scalable capacities from 15 to 500+ curated guest boxes</span>
              </li>
              <li>
                <Check size={16} />
                <span>Bespoke dietary combinations (Sweet & Savory, High Protein, Vegetarian)</span>
              </li>
            </ul>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="#contact" className="btn btn-primary">
                Request Corporate Quote <ArrowRight size={15} />
              </a>
              <button className="btn btn-outline" onClick={onOpenCustomizer}>
                <PackagePlus size={16} /> Open Bespoke Box Builder
              </button>
            </div>
          </div>

          <div className="catering-media-box">
            <img src="/assets/small_chops.jpg" alt="Tchow Artisanal Small Chops Catering" />
          </div>
        </div>
      </div>
    </section>
  );
}

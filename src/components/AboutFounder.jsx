import React from 'react';
import { Award, Palette, Zap, Heart } from 'lucide-react';

export default function AboutFounder() {
  return (
    <section className="section-about" id="about">
      <div className="container">
        <div className="text-center" style={{ marginBottom: '3.5rem' }}>
          <span className="section-eyebrow">BRAND MANIFESTO</span>
          <h2 className="section-heading">More Than Meals. <span className="gold-gradient-text">Cherished Moments.</span></h2>
          <p className="section-description">
            Starting as an online-first brand, Tchow is engineered to serve customers with speed and elegance while establishing the foundation for our regional physical presence.
          </p>
        </div>

        <div className="about-split">
          <div className="founder-letter">
            <span className="founder-letter-head">Founder's Note</span>
            <p className="founder-message">
              "Tchow was created from a simple idea: food should be more than something we consume. It should create moments, connections, and experiences that people remember. From beautifully prepared meals and desserts to refreshing beverages and customized food experiences, Tchow exists to bring quality, creativity, and warmth into everyday dining."
            </p>
            <div className="founder-sign">
              <div className="founder-name-title">
                <strong>Toyomfonabasi Leo Uttah</strong>
                <span>Founder & Chief Executive Officer</span>
              </div>
              <span className="gold-text" style={{ fontSize: '0.85rem', fontWeight: '700', letterSpacing: '1px' }}>TCHOW CO.</span>
            </div>
          </div>

          <div className="brand-pillars-grid">
            <div className="pillar-item">
              <div className="pillar-item-icon"><Award size={22} /></div>
              <h4>Uncompromising Craft</h4>
              <p>Every pancake batch, chop box, and drink is produced with chef-grade ingredients and precise seasoning.</p>
            </div>

            <div className="pillar-item">
              <div className="pillar-item-icon"><Palette size={22} /></div>
              <h4>Aesthetic Plating</h4>
              <p>Designed for remarkable unboxing, tactile luxury packaging, and Instagram-worthy aesthetics.</p>
            </div>

            <div className="pillar-item">
              <div className="pillar-item-icon"><Zap size={22} /></div>
              <h4>Direct Efficiency</h4>
              <p>A digitized, online-first production workflow guaranteeing on-time dispatch and fresh delivery.</p>
            </div>

            <div className="pillar-item">
              <div className="pillar-item-icon"><Heart size={22} /></div>
              <h4>Lifestyle Connection</h4>
              <p>Curated dining options tailored for morning meetings, weekend brunches, and celebratory gatherings.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

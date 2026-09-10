import React from 'react';
import { Check, ArrowUpRight, Sparkles } from 'lucide-react';

export default function GrowthRoadmap() {
  return (
    <section className="section-roadmap" id="roadmap">
      <div className="container">
        <div className="text-center" style={{ marginBottom: '3.5rem' }}>
          <span className="section-eyebrow">ENTERPRISE ROADMAP</span>
          <h2 className="section-heading">Strategic <span className="gold-gradient-text">Growth Architecture</span></h2>
          <p className="section-description">
            A methodical, three-phase expansion blueprint moving from digitized online scale to flagship physical experience hubs.
          </p>
        </div>

        <div className="roadmap-phase-grid">
          {/* Phase 1 */}
          <div className="phase-card active-phase">
            <div className="phase-header-row">
              <span className="phase-index">01</span>
              <span className="phase-status-pill active">In Execution</span>
            </div>
            <h3>Phase 1: Digital Foundation</h3>
            <span className="phase-subtitle">Customer Acquisition & Systems</span>
            <ul className="phase-list">
              <li>
                <Check size={15} />
                <span>Scale direct-to-consumer online order volume</span>
              </li>
              <li>
                <Check size={15} />
                <span>Establish premium packaging & brand identity standards</span>
              </li>
              <li>
                <Check size={15} />
                <span>Refine high-efficiency kitchen batch operations</span>
              </li>
              <li>
                <Check size={15} />
                <span>Expand corporate and recurring breakfast subscribers</span>
              </li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="phase-card">
            <div className="phase-header-row">
              <span className="phase-index">02</span>
              <span className="phase-status-pill">Milestone 2</span>
            </div>
            <h3>Phase 2: Scale & Capacity</h3>
            <span className="phase-subtitle">Production Expansion & B2B</span>
            <ul className="phase-list">
              <li>
                <ArrowUpRight size={15} />
                <span>Deploy commercial culinary and automated baking equipment</span>
              </li>
              <li>
                <ArrowUpRight size={15} />
                <span>Launch corporate breakfast and dessert subscription contracts</span>
              </li>
              <li>
                <ArrowUpRight size={15} />
                <span>Expand signature bottled beverage and packaged snack line</span>
              </li>
              <li>
                <ArrowUpRight size={15} />
                <span>Amplify regional multi-channel brand marketing</span>
              </li>
            </ul>
          </div>

          {/* Phase 3 */}
          <div className="phase-card">
            <div className="phase-header-row">
              <span className="phase-index">03</span>
              <span className="phase-status-pill">Visionary Goal</span>
            </div>
            <h3>Phase 3: Tchow Café & Retail</h3>
            <span className="phase-subtitle">Experiential Hospitality Hubs</span>
            <ul className="phase-list">
              <li>
                <Sparkles size={15} />
                <span>Flagship <strong>Tchow Café</strong> physical retail destinations</span>
              </li>
              <li>
                <Sparkles size={15} />
                <span>Evening botanical mocktail lounge & dessert bars</span>
              </li>
              <li>
                <Sparkles size={15} />
                <span>Centralized commissary kitchen serving multiple satellite kiosks</span>
              </li>
              <li>
                <Sparkles size={15} />
                <span>National retail distribution for packaged items</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

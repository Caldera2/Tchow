import React, { useState } from 'react';
import { 
  Cake, 
  TrendingUp, 
  Handshake, 
  Settings, 
  Check, 
  Calculator, 
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { INVESTOR_TIERS } from '../data/menuData';

const iconMap = {
  Cake: Cake,
  TrendingUp: TrendingUp,
  Handshake: Handshake,
  Settings: Settings,
};

export default function InvestorHub({ onSelectTier }) {
  const [investAmount, setInvestAmount] = useState(1000000);
  const [investModel, setInvestModel] = useState('fixed'); // 'fixed' | 'growth'

  const rate = investModel === 'fixed' ? 0.25 : 0.35;
  const netReturn = investAmount * rate;
  const totalPayout = investAmount + netReturn;

  return (
    <section className="section-investors" id="investors">
      <div className="container">
        <div className="text-center" style={{ marginBottom: '3.5rem' }}>
          <span className="section-eyebrow">PARTNERSHIP & INVESTMENT</span>
          <h2 className="section-heading">Institutional & Private <span className="gold-gradient-text">Capital Hub</span></h2>
          <p className="section-description">
            Structured investment pathways designed for predictability, shared upside, and strategic asset growth.
          </p>
        </div>

        {/* 4 Models */}
        <div className="investor-tiers-layout">
          {INVESTOR_TIERS.map(tier => {
            const IconComp = iconMap[tier.icon] || Cake;
            return (
              <div 
                key={tier.id} 
                className={`tier-box ${tier.recommended ? 'popular' : ''}`}
              >
                {tier.recommended && <span className="popular-badge">High Demand</span>}

                <div className="tier-icon-wrap">
                  <IconComp size={24} />
                </div>

                <h3>{tier.title}</h3>
                <span className="tier-target">{tier.target}</span>
                <p className="tier-desc-text">{tier.description}</p>

                <ul className="tier-checklist">
                  {tier.features.map((feat, i) => (
                    <li key={i}>
                      <Check size={13} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  className={`btn ${tier.recommended ? 'btn-primary' : 'btn-outline'} btn-full`}
                  onClick={() => onSelectTier(tier.title)}
                >
                  {tier.ctaText}
                </button>
              </div>
            );
          })}
        </div>

        {/* ROI Simulator & Fund Allocation */}
        <div className="calc-deployment-panel">
          <div className="calc-deployment-grid">
            <div className="calc-block">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-primary)', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                <Calculator size={14} /> Capital Projection Simulator
              </div>
              <h3>Projected Return Estimator</h3>
              <p>Simulate annualized yields based on committed capital tranche and chosen structure.</p>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Investment Commitment:</span>
                  <span className="slider-amount-val">₦{investAmount.toLocaleString()}</span>
                </div>

                <input 
                  type="range" 
                  min={200000} 
                  max={10000000} 
                  step={100000} 
                  value={investAmount}
                  onChange={(e) => setInvestAmount(Number(e.target.value))}
                  className="calc-range-input"
                />

                <div className="model-radio-group">
                  <label className="model-radio-option">
                    <input 
                      type="radio" 
                      name="investStructure" 
                      value="fixed" 
                      checked={investModel === 'fixed'}
                      onChange={() => setInvestModel('fixed')}
                    />
                    <span>Fixed ROI (25% p.a.)</span>
                  </label>
                  <label className="model-radio-option">
                    <input 
                      type="radio" 
                      name="investStructure" 
                      value="growth" 
                      checked={investModel === 'growth'}
                      onChange={() => setInvestModel('growth')}
                    />
                    <span>Performance Target (~35% p.a.)</span>
                  </label>
                </div>
              </div>

              <div className="calc-summary-card">
                <div className="calc-summary-row">
                  <span className="label">Estimated Net Yield:</span>
                  <span className="value yield">+₦{netReturn.toLocaleString()} ({Math.round(rate * 100)}%)</span>
                </div>
                <div className="calc-summary-row">
                  <span className="label">Total Maturity Payout:</span>
                  <span className="value">₦{totalPayout.toLocaleString()}</span>
                </div>
                <div className="calc-summary-row">
                  <span className="label">Term Duration:</span>
                  <span className="value">12 Months</span>
                </div>
              </div>
            </div>

            <div className="alloc-block">
              <h3>Use of Funds & Capital Efficiency</h3>
              <p>Direct deployment breakdown supporting production scaling and high gross margin:</p>

              <div className="alloc-progress-group">
                <div className="alloc-item">
                  <div className="alloc-line-info">
                    <span>Kitchen Machinery & Baking Equipment</span>
                    <span>30%</span>
                  </div>
                  <div className="alloc-track"><div className="alloc-fill" style={{ width: '30%' }}></div></div>
                </div>

                <div className="alloc-item">
                  <div className="alloc-line-info">
                    <span>Branding, Custom Packaging & Assets</span>
                    <span>25%</span>
                  </div>
                  <div className="alloc-track"><div className="alloc-fill" style={{ width: '25%' }}></div></div>
                </div>

                <div className="alloc-item">
                  <div className="alloc-line-info">
                    <span>Customer Acquisition & Digital Performance</span>
                    <span>20%</span>
                  </div>
                  <div className="alloc-track"><div className="alloc-fill" style={{ width: '20%' }}></div></div>
                </div>

                <div className="alloc-item">
                  <div className="alloc-line-info">
                    <span>Bulk Inventory & Ingredient Procurement</span>
                    <span>15%</span>
                  </div>
                  <div className="alloc-track"><div className="alloc-fill" style={{ width: '15%' }}></div></div>
                </div>

                <div className="alloc-item">
                  <div className="alloc-line-info">
                    <span>Operational Logistics & Systems</span>
                    <span>10%</span>
                  </div>
                  <div className="alloc-track"><div className="alloc-fill" style={{ width: '10%' }}></div></div>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-full"
                onClick={() => onSelectTier('Investor Prospectus Application')}
              >
                <FileSpreadsheet size={16} /> Request Official Prospectus & Apply
              </button>
            </div>
          </div>
        </div>

        {/* 6 Steps */}
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text-main)' }}>
            Structured 6-Step Partnership Onboarding
          </h3>
        </div>

        <div className="process-six-steps">
          <div className="process-step-item">
            <span className="step-digit">01</span>
            <h4>Review</h4>
            <p>Explore partnership tiers & prospectus.</p>
          </div>
          <div className="process-step-item">
            <span className="step-digit">02</span>
            <h4>Select</h4>
            <p>Choose your preferred model.</p>
          </div>
          <div className="process-step-item">
            <span className="step-digit">03</span>
            <h4>Application</h4>
            <p>Submit your interest details.</p>
          </div>
          <div className="process-step-item">
            <span className="step-digit">04</span>
            <h4>Briefing</h4>
            <p>Executive alignment meeting.</p>
          </div>
          <div className="process-step-item">
            <span className="step-digit">05</span>
            <h4>Agreement</h4>
            <p>Execute formal legal framework.</p>
          </div>
          <div className="process-step-item">
            <span className="step-digit">06</span>
            <h4>Growth</h4>
            <p>Commence shared returns journey.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

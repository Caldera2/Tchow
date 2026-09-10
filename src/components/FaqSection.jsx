import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'How does bespoke box ordering and scheduled delivery operate?',
    a: 'You can use our interactive "Bespoke Box" builder on this site to choose your pancakes, small chops, parfaits, and drinks, and dispatch directly to our concierge via WhatsApp for instant scheduling, dietary customization, and payment processing.'
  },
  {
    q: 'What are the capital minimums for investor participation?',
    a: 'Participation tiers commence from ₦200,000 for Fixed Return 12-month tranches (25% p.a.), scaling up to growth revenue share and strategic equity allocations. Please submit an application or connect directly with our founder Toyomfonabasi Leo Uttah.'
  },
  {
    q: 'Can corporate packaging feature company branding for events?',
    a: 'Yes. For orders of 25 boxes and above, we provide bespoke co-branded luxury sleeves and personalized menu inserts tailored to your company or social celebration.'
  },
  {
    q: 'What quality standards govern ingredient sourcing?',
    a: 'All items are produced fresh daily in small batches with strictly monitored food safety protocols, premium unbleached flours, fresh farm eggs, high-grade dairy, and 100% natural botanical ingredients for our hibiscus zobo.'
  }
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="section-faq">
      <div className="container">
        <div className="text-center" style={{ marginBottom: '3.5rem' }}>
          <span className="section-eyebrow">FREQUENTLY ASKED QUESTIONS</span>
          <h2 className="section-heading">Executive <span className="gold-gradient-text">Inquiries & Clarity</span></h2>
        </div>

        <div className="faq-accordion-list">
          {FAQS.map((faq, idx) => (
            <div 
              key={idx} 
              className={`faq-card ${openIdx === idx ? 'open' : ''}`}
            >
              <button 
                className="faq-trigger"
                onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
                aria-expanded={openIdx === idx}
              >
                <span>{faq.q}</span>
                <ChevronDown size={17} />
              </button>
              {openIdx === idx && (
                <div className="faq-body">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

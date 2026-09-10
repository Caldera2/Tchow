import React, { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, ShoppingBag, Sparkles, MessageSquare } from 'lucide-react';
import { BOX_SIZES } from '../data/menuData';

const SNACK_OPTIONS = [
  { id: 'puff-puff', name: 'Golden Puff Puff' },
  { id: 'samosa', name: 'Crispy Beef Samosa' },
  { id: 'spring-roll', name: 'Chicken & Veg Spring Roll' },
  { id: 'chicken-pops', name: 'Crispy Chicken Pops' },
  { id: 'peppered-wings', name: 'Glazed BBQ Wings' },
  { id: 'gizdodo', name: 'Spicy Gizdodo' },
];

const DRINK_OPTIONS = [
  { id: 'sunset-cooler', name: 'Tchow Sunset Cooler (Hibiscus & Passionfruit)' },
  { id: 'chapman', name: 'Classic Nigerian Chapman' },
  { id: 'berry-bliss', name: 'Berry Bliss Mocktail' },
  { id: 'caramel-latte', name: 'Iced Caramel Latte' },
  { id: 'orange-juice', name: 'Cold-Pressed Orange Juice' },
];

const DESSERT_OPTIONS = [
  { id: 'parfait-royale', name: 'Parfait Royale (Berries & Mascarpone)' },
  { id: 'brownie-parfait', name: 'Fudge Brownie Parfait' },
  { id: 'oreo-cup', name: 'Oreo Cookies & Cream Cup' },
  { id: 'cupcake', name: 'Red Velvet Gold Cupcake' },
];

export default function BuildBoxModal({ isOpen, onClose, onAddCustomBoxToCart, onShowToast }) {
  const [step, setStep] = useState(1);
  const [selectedSize, setSelectedSize] = useState(BOX_SIZES[1]); // Default to 'The Tchow Box (Regular)'
  const [selectedSnacks, setSelectedSnacks] = useState(['puff-puff', 'samosa', 'spring-roll', 'chicken-pops']);
  const [selectedDrink, setSelectedDrink] = useState(DRINK_OPTIONS[0].name);
  const [selectedDessert, setSelectedDessert] = useState(DESSERT_OPTIONS[0].name);

  if (!isOpen) return null;

  const toggleSnack = (snackId) => {
    if (selectedSnacks.includes(snackId)) {
      if (selectedSnacks.length > 1) {
        setSelectedSnacks(selectedSnacks.filter(id => id !== snackId));
      }
    } else {
      setSelectedSnacks([...selectedSnacks, snackId]);
    }
  };

  const handleFinish = (directWhatsApp = false) => {
    const snackNames = selectedSnacks
      .map(id => SNACK_OPTIONS.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const customBoxItem = {
      id: `custom-box-${Date.now()}`,
      name: `Custom ${selectedSize.name}`,
      category: 'signature',
      price: selectedSize.price,
      description: `Snacks: ${snackNames} | Drink: ${selectedDrink} | Dessert: ${selectedDessert}`,
      image: '/assets/small_chops.jpg',
      tag: 'Bespoke Curation'
    };

    if (directWhatsApp) {
      let message = `*🌟 NEW TCHOW CUSTOM BOX ORDER*\n\n`;
      message += `*Package:* ${selectedSize.name} (₦${selectedSize.price.toLocaleString()})\n`;
      message += `*Snacks Choice:* ${snackNames}\n`;
      message += `*Drink:* ${selectedDrink}\n`;
      message += `*Dessert:* ${selectedDessert}\n\n`;
      message += `Hello Tchow! I've curated my bespoke box and would like to confirm my order and delivery schedule.`;

      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/2348123456789?text=${encoded}`, '_blank');
      onShowToast('📱 Opening WhatsApp with your custom box order!');
      onClose();
    } else {
      onAddCustomBoxToCart(customBoxItem);
      onShowToast(`🎉 Added ${customBoxItem.name} to your box!`);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop-luxury open">
      <div className="modal-luxury-window" style={{ maxWidth: '680px' }}>
        <div className="modal-luxury-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-primary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>
              <Sparkles size={14} /> 5-Step Experience Builder
            </div>
            <h3>Build Your Own Tchow Box</h3>
          </div>
          <button className="drawer-head-close" onClick={onClose} aria-label="Close modal">
            <X size={22} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          {['1. Box Size', '2. Snacks', '3. Drink', '4. Dessert', '5. Review'].map((label, idx) => (
            <div 
              key={idx} 
              style={{ 
                fontSize: '0.78rem', 
                fontWeight: '700',
                color: step === idx + 1 ? 'var(--gold-primary)' : step > idx + 1 ? 'var(--text-main)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <span style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                background: step === idx + 1 ? 'var(--gold-primary)' : step > idx + 1 ? 'var(--gold-dark)' : 'var(--bg-surface-elevated)', 
                color: step === idx + 1 ? '#000' : '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem'
              }}>
                {idx + 1}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Size */}
        {step === 1 && (
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Step 1: Choose Your Box Size
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select the size that suits your craving or group.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              {BOX_SIZES.map(box => (
                <div 
                  key={box.id}
                  onClick={() => setSelectedSize(box)}
                  style={{
                    padding: '1.2rem',
                    background: selectedSize.id === box.id ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    border: `1px solid ${selectedSize.id === box.id ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {box.popular && (
                    <span style={{ position: 'absolute', top: '-8px', right: '10px', background: 'var(--gold-primary)', color: '#000', fontSize: '0.65rem', fontWeight: '800', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      POPULAR
                    </span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{box.name}</strong>
                    <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>₦{box.price.toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{box.itemsCount}</p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold-light)' }}>{box.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Snacks */}
        {step === 2 && (
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Step 2: Choose Your Snacks Assortment
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select which savory and spicy snacks you want included in your {selectedSize.name}.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '2rem' }}>
              {SNACK_OPTIONS.map(snack => {
                const isSelected = selectedSnacks.includes(snack.id);
                return (
                  <div 
                    key={snack.id}
                    onClick={() => toggleSnack(snack.id)}
                    style={{
                      padding: '1rem',
                      background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                      border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', color: isSelected ? 'var(--text-main)' : 'var(--text-body)', fontWeight: isSelected ? '600' : '400' }}>
                      {snack.name}
                    </span>
                    <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}`, background: isSelected ? 'var(--gold-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <Check size={12} color="#000" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Drink */}
        {step === 3 && (
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Step 3: Choose Your Drink
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select a refreshing chilled specialty beverage or coffee.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
              {DRINK_OPTIONS.map(drink => {
                const isSelected = selectedDrink === drink.name;
                return (
                  <div 
                    key={drink.id}
                    onClick={() => setSelectedDrink(drink.name)}
                    style={{
                      padding: '0.9rem 1.2rem',
                      background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                      border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: isSelected ? '600' : '400' }}>
                      {drink.name}
                    </span>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}`, background: isSelected ? 'var(--gold-primary)' : 'transparent' }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Dessert */}
        {step === 4 && (
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Step 4: Choose Your Dessert
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select an artisan dessert cup or parfait to complete your experience.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
              {DESSERT_OPTIONS.map(dessert => {
                const isSelected = selectedDessert === dessert.name;
                return (
                  <div 
                    key={dessert.id}
                    onClick={() => setSelectedDessert(dessert.name)}
                    style={{
                      padding: '0.9rem 1.2rem',
                      background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                      border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: isSelected ? '600' : '400' }}>
                      {dessert.name}
                    </span>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}`, background: isSelected ? 'var(--gold-primary)' : 'transparent' }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Step 5: Review Your Curation
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Everything looks delicious! How would you like to proceed?
            </p>

            <div className="calc-summary-card" style={{ marginBottom: '2rem' }}>
              <div className="calc-summary-row">
                <span className="label">Package:</span>
                <span className="value">{selectedSize.name}</span>
              </div>
              <div className="calc-summary-row">
                <span className="label">Selected Snacks:</span>
                <span className="value" style={{ fontSize: '0.82rem', textAlign: 'right', maxWidth: '60%' }}>
                  {selectedSnacks.map(id => SNACK_OPTIONS.find(s => s.id === id)?.name).join(', ')}
                </span>
              </div>
              <div className="calc-summary-row">
                <span className="label">Drink:</span>
                <span className="value" style={{ fontSize: '0.82rem' }}>{selectedDrink}</span>
              </div>
              <div className="calc-summary-row">
                <span className="label">Dessert:</span>
                <span className="value" style={{ fontSize: '0.82rem' }}>{selectedDessert}</span>
              </div>
              <div className="calc-summary-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem', marginTop: '0.5rem' }}>
                <span className="label" style={{ fontWeight: '700', color: 'var(--text-main)' }}>Total Price:</span>
                <span className="value yield" style={{ fontSize: '1.3rem' }}>₦{selectedSize.price.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          {step > 1 ? (
            <button className="btn btn-outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              Next Step <ArrowRight size={16} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn btn-outline" onClick={() => handleFinish(false)}>
                <ShoppingBag size={16} /> Add to Cart Drawer
              </button>
              <button className="btn btn-whatsapp" onClick={() => handleFinish(true)}>
                <MessageSquare size={16} /> Order on WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

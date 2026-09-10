import React, { useState } from 'react';
import { 
  Sparkles, 
  Utensils, 
  PartyPopper, 
  Cake, 
  Wine, 
  Coffee, 
  Plus, 
  Clock, 
  Star,
  PackagePlus,
  Flame,
  LayoutGrid
} from 'lucide-react';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';

const iconMap = {
  Sparkles: Sparkles,
  Croissant: Coffee,
  Utensils: Utensils,
  PartyPopper: PartyPopper,
  Cake: Cake,
  GlassWater: Wine,
  Wine: Wine,
  Coffee: Coffee,
  LayoutGrid: LayoutGrid
};

export default function MenuSection({ onAddToCart, onOpenCustomizer }) {
  const [activeCategory, setActiveCategory] = useState('signature');

  const filteredItems = activeCategory === 'all'
    ? MENU_ITEMS
    : MENU_ITEMS.filter(item => item.category === activeCategory);

  return (
    <section className="section-menu" id="menu">
      <div className="container">
        <div className="text-center" style={{ marginBottom: '3rem' }}>
          <span className="section-eyebrow">THE CULINARY EXPERIENCE</span>
          <h2 className="section-heading">Modern Flavors. <span className="gold-gradient-text">Artisanal Craft.</span></h2>
          <p className="section-description">
            From signature customizable Tchow Boxes and weekend breakfast platters to small chops packs and craft botanical refreshers.
          </p>
        </div>

        {/* Category Navigation Tabs */}
        <div className="menu-nav-tabs">
          {MENU_CATEGORIES.map(cat => {
            const IconComp = iconMap[cat.icon] || LayoutGrid;
            return (
              <button
                key={cat.id}
                className={`menu-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <IconComp size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Menu Cards Portfolio Grid */}
        <div className="menu-portfolio-grid">
          {filteredItems.map(item => (
            <div key={item.id} className="dish-card">
              <div className="dish-media">
                <img src={item.image} alt={item.name} loading="lazy" />
                {item.tag && <span className="dish-tag">{item.tag}</span>}
              </div>

              <div className="dish-body">
                <div className="dish-header">
                  <h3 className="dish-title">{item.name}</h3>
                  <span className="dish-price">₦{item.price.toLocaleString()}</span>
                </div>

                <p className="dish-desc">{item.description}</p>

                <div className="dish-specs">
                  <span className="spec-item">
                    <Clock size={12} />
                    {item.prepTime}
                  </span>
                  <span className="spec-item">
                    <Star size={12} style={{ color: 'var(--gold-primary)' }} />
                    {item.rating} ({item.reviews})
                  </span>
                </div>

                <button 
                  className="add-dish-btn"
                  onClick={() => onAddToCart(item)}
                >
                  <Plus size={15} />
                  <span>Add to Bespoke Box</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Build Your Own Box Banner */}
        <div className="premium-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-gold-subtle)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-primary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>
              <Sparkles size={14} /> The Memorable Experience
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              Build Your Own Tchow Box
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Step-by-step box curation: Select your size (Mini, Regular, Premium, Mega), snacks, craft drink, and artisan dessert cup.
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onOpenCustomizer}>
            <PackagePlus size={18} /> Launch 5-Step Box Builder
          </button>
        </div>
      </div>
    </section>
  );
}

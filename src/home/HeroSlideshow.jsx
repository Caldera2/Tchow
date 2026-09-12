import { useEffect, useState } from 'react';
import { heroSlides, startHeroRotation } from './heroSlides.mjs';

export function HeroSlideshow() {
  const [slide, setSlide] = useState(0);
  const [paused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (paused) return;
    return startHeroRotation(() => setSlide((current) => (current + 1) % heroSlides.length));
  }, [paused]);
  useEffect(() => {
    // Warm the next image without adding another visible image layer.
    const next = new Image();
    next.src = heroSlides[(slide + 1) % heroSlides.length].src;
  }, [slide]);
  return <div className="hero-slideshow" role="region" aria-label="Tchow food slideshow" aria-roledescription="carousel">
    <img src={heroSlides[slide].src} alt={heroSlides[slide].alt} fetchPriority="high" />
    <div className="hero-slide-controls">
      <span>{String(slide + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}</span>
    </div>
  </div>;
}

export const HERO_INTERVAL_MS = 5000;
export const heroSlides = [
  { src: '/assets/hero.jpg', alt: 'A colourful spread of breakfast and small chops' },
  { src: '/assets/small_chops.jpg', alt: 'Golden small chops and savoury bites' },
  { src: '/assets/pancakes.jpg', alt: 'Pancakes with fruit for breakfast' },
  { src: '/assets/desserts.jpg', alt: 'A selection of sweet desserts' },
  { src: '/assets/beverages.jpg', alt: 'Refreshing drinks for the table' },
];
export function startHeroRotation(advance, schedule = setInterval, cancel = clearInterval) {
  const timer = schedule(advance, HERO_INTERVAL_MS);
  return () => cancel(timer);
}

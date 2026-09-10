export const MENU_CATEGORIES = [
  { id: 'signature', label: 'Signature Collection', icon: 'Sparkles', badge: 'Must Try' },
  { id: 'breakfast', label: 'Breakfast (Weekends)', icon: 'Croissant', badge: '7am - 12pm' },
  { id: 'chops', label: 'Artisanal Small Chops', icon: 'Utensils', badge: 'Crowd Favorite' },
  { id: 'party-packs', label: 'Party & Event Packs', icon: 'PartyPopper', badge: 'Save up to 20%' },
  { id: 'desserts', label: 'Desserts & Parfaits', icon: 'Cake', badge: 'Sweet Delights' },
  { id: 'specialty', label: 'Specialty Drinks', icon: 'GlassWater', badge: 'Signature' },
  { id: 'refreshers', label: 'Chill Refreshers', icon: 'Wine', badge: 'Fresh & Cold' },
  { id: 'coffee', label: 'Coffee & Warm Brews', icon: 'Coffee', badge: 'Barista Bar' }
];

export const SIGNATURE_ITEMS = [
  {
    id: 'sig-tchow-box',
    name: 'The Tchow Box',
    category: 'signature',
    price: 6500,
    description: 'Our flagship signature customizable box. Includes your choice of 12 premium chops, 1 artisan dessert cup, and 1 signature chilled refresher.',
    image: '/assets/small_chops.jpg',
    tag: 'Bestseller',
    prepTime: '15 mins',
    calories: '620 kcal',
    rating: 5.0,
    reviews: 384,
    badge: 'Flagship'
  },
  {
    id: 'sig-weekend-bliss',
    name: 'Weekend Bliss Breakfast Platter',
    category: 'signature',
    price: 8500,
    description: 'Gourmet brunch for two: Fluffy banana pancake stack, French toast triangles, silky scrambled eggs, gourmet sausages, berry compote, and 2 fresh orange juices.',
    image: '/assets/pancakes.jpg',
    tag: 'Weekend For 2',
    prepTime: '20 mins',
    calories: '780 kcal',
    rating: 4.9,
    reviews: 240,
    badge: 'Brunch Special'
  },
  {
    id: 'sig-parfait-royale',
    name: 'Parfait Royale',
    category: 'signature',
    price: 4000,
    description: 'Velvety vanilla sponge layered with whipped mascarpone, fresh strawberry and blueberry reduction, toasted honey almond granola, and gold leaf.',
    image: '/assets/desserts.jpg',
    tag: 'Chef Signature',
    prepTime: '5 mins',
    calories: '410 kcal',
    rating: 4.9,
    reviews: 195,
    badge: 'Pure Indulgence'
  },
  {
    id: 'sig-sunset-cooler',
    name: 'Tchow Sunset Cooler',
    category: 'signature',
    price: 2500,
    description: 'Slow-infused botanical hibiscus zobo layered over passionfruit pulp, fresh lime, crushed ice, and mint sprigs. Our iconic drink.',
    image: '/assets/beverages.jpg',
    tag: 'Iconic Drink',
    prepTime: '5 mins',
    calories: '130 kcal',
    rating: 5.0,
    reviews: 410,
    badge: 'House Special'
  },
  {
    id: 'sig-crunch-combo',
    name: 'The Crunch Combo (For 1)',
    category: 'signature',
    price: 4500,
    description: 'Personal pick-me-up: 8 assorted hot small chops (puff puff, samosa, spring roll, chicken pops) paired with a refreshing Chapman or iced latte.',
    image: '/assets/small_chops.jpg',
    tag: 'Quick Bite',
    prepTime: '12 mins',
    calories: '490 kcal',
    rating: 4.8,
    reviews: 160,
    badge: 'Solo Treat'
  },
  {
    id: 'sig-celebration-feast',
    name: 'Celebration Feast Platter',
    category: 'signature',
    price: 24000,
    description: 'Curated for group celebrations and office meetings: 50 assorted hot chops, 4 dessert parfaits, and 4 specialty drinks.',
    image: '/assets/hero.jpg',
    tag: 'Party Size',
    prepTime: '30 mins',
    calories: 'Party Platter',
    rating: 5.0,
    reviews: 88,
    badge: 'Feast'
  }
];

export const MENU_ITEMS = [
  ...SIGNATURE_ITEMS,

  // BREAKFAST COLLECTION (WEEKENDS)
  {
    id: 'bf-classic-platter',
    name: 'Classic Breakfast Platter',
    category: 'breakfast',
    price: 4500,
    description: 'Fluffy buttermilk pancakes, silky scrambled eggs, 2 breakfast sausages, and maple syrup.',
    image: '/assets/pancakes.jpg',
    tag: 'Classic',
    prepTime: '15 mins',
    calories: '510 kcal',
    rating: 4.8,
    reviews: 110
  },
  {
    id: 'bf-pancake-stack',
    name: 'Banana Sweet Cream Pancake Stack',
    category: 'breakfast',
    price: 3500,
    description: 'Triple golden banana pancakes infused with ripe bananas, dusted with powdered sugar and rich maple butter.',
    image: '/assets/pancakes.jpg',
    tag: 'Popular',
    prepTime: '15 mins',
    calories: '430 kcal',
    rating: 4.9,
    reviews: 145
  },
  {
    id: 'bf-french-toast',
    name: 'Brioche French Toast & Berries',
    category: 'breakfast',
    price: 3800,
    description: 'Thick brioche soaked in vanilla-cinnamon custard, griddled golden and topped with fresh strawberries.',
    image: '/assets/pancakes.jpg',
    tag: 'Chef Pick',
    prepTime: '15 mins',
    calories: '460 kcal',
    rating: 4.9,
    reviews: 82
  },
  {
    id: 'bf-chicken-waffles',
    name: 'Crispy Chicken & Belgian Waffles',
    category: 'breakfast',
    price: 5500,
    description: 'Golden Belgian waffle topped with crispy spiced chicken tenders and warm spiced honey drizzle.',
    image: '/assets/pancakes.jpg',
    tag: 'Decadent',
    prepTime: '18 mins',
    calories: '680 kcal',
    rating: 4.9,
    reviews: 95
  },
  {
    id: 'bf-egg-muffin',
    name: 'Egg & Sausage Brioche Muffin',
    category: 'breakfast',
    price: 3000,
    description: 'Toasted English brioche filled with seasoned sausage patty, folded egg, melted cheddar, and secret sauce.',
    image: '/assets/pancakes.jpg',
    tag: 'Quick Grab',
    prepTime: '10 mins',
    calories: '390 kcal',
    rating: 4.7,
    reviews: 64
  },
  {
    id: 'bf-yogurt-bowl',
    name: 'Greek Yogurt & Fruit Granola Bowl',
    category: 'breakfast',
    price: 3200,
    description: 'Creamy Greek yogurt layered with organic honey, seasonal fruit slices, chia seeds, and toasted granola.',
    image: '/assets/desserts.jpg',
    tag: 'Healthy',
    prepTime: '5 mins',
    calories: '280 kcal',
    rating: 4.8,
    reviews: 58
  },

  // SMALL CHOPS
  {
    id: 'chops-puff-puff',
    name: 'Golden Glazed Puff Puff (10 pcs)',
    category: 'chops',
    price: 1500,
    description: 'Classic pillowy Nigerian puff puff with a light nutmeg aroma and crisp golden exterior.',
    image: '/assets/small_chops.jpg',
    tag: 'Comfort Food',
    prepTime: '10 mins',
    calories: '320 kcal',
    rating: 4.9,
    reviews: 280
  },
  {
    id: 'chops-samosa',
    name: 'Crispy Beef Samosas (5 pcs)',
    category: 'chops',
    price: 2500,
    description: 'Thin crispy pastry triangles stuffed with aromatic spiced minced beef, onions, and fresh herbs.',
    image: '/assets/small_chops.jpg',
    tag: 'Savory',
    prepTime: '12 mins',
    calories: '340 kcal',
    rating: 4.8,
    reviews: 190
  },
  {
    id: 'chops-spring-rolls',
    name: 'Crunchy Veg & Chicken Spring Rolls (5 pcs)',
    category: 'chops',
    price: 2500,
    description: 'Golden, extra crispy rolls filled with seasoned shredded chicken and fresh julienned vegetables.',
    image: '/assets/small_chops.jpg',
    tag: 'Crunchy',
    prepTime: '12 mins',
    calories: '310 kcal',
    rating: 4.8,
    reviews: 165
  },
  {
    id: 'chops-gizdodo',
    name: 'Gourmet Peppered Gizdodo Box',
    category: 'chops',
    price: 3500,
    description: 'Tender diced gizzards and sweet fried plantains tossed in rich, spicy caramelized pepper sauce.',
    image: '/assets/small_chops.jpg',
    tag: 'Spicy Delight',
    prepTime: '15 mins',
    calories: '420 kcal',
    rating: 5.0,
    reviews: 215
  },
  {
    id: 'chops-chicken-pops',
    name: 'Crispy Seasoned Chicken Pops',
    category: 'chops',
    price: 2800,
    description: 'Bite-sized buttermilk fried chicken breast pieces served with tangy garlic herb dip.',
    image: '/assets/small_chops.jpg',
    tag: 'Snack Favorite',
    prepTime: '12 mins',
    calories: '380 kcal',
    rating: 4.9,
    reviews: 140
  },
  {
    id: 'chops-peppered-wings',
    name: 'Glazed Peppered Wings (4 pcs)',
    category: 'chops',
    price: 3200,
    description: 'Juicy jumbo wings fried and coated in sweet habanero barbecue glaze.',
    image: '/assets/small_chops.jpg',
    tag: 'Finger Licking',
    prepTime: '15 mins',
    calories: '450 kcal',
    rating: 4.9,
    reviews: 175
  },

  // PARTY & EVENT PACKS
  {
    id: 'party-mini-20',
    name: 'Mini Party Pack (20 Pieces)',
    category: 'party-packs',
    price: 7500,
    description: 'Pick any 20 pieces: e.g. 5 Puff Puff, 5 Spring Rolls, 5 Samosas, 5 Chicken Pops. Great for 2–3 people.',
    image: '/assets/small_chops.jpg',
    tag: 'Party Size',
    prepTime: '20 mins',
    calories: '20 Pieces',
    rating: 4.9,
    reviews: 130
  },
  {
    id: 'party-classic-40',
    name: 'Classic Party Pack (40 Pieces)',
    category: 'party-packs',
    price: 14000,
    description: 'Customizable 40-piece assortment: 10 Puff Puff, 10 Samosas, 10 Spring Rolls, 10 Chicken Pops + 2 dips.',
    image: '/assets/small_chops.jpg',
    tag: 'Best Value',
    prepTime: '25 mins',
    calories: '40 Pieces',
    rating: 5.0,
    reviews: 185
  },
  {
    id: 'party-family-80',
    name: 'Family Celebration Pack (80 Pieces)',
    category: 'party-packs',
    price: 26000,
    description: 'Generous 80-piece assortment for birthdays and weekend family get-togethers + 4 signature dipping sauces.',
    image: '/assets/small_chops.jpg',
    tag: 'Family Favorite',
    prepTime: '30 mins',
    calories: '80 Pieces',
    rating: 5.0,
    reviews: 92
  },
  {
    id: 'party-event-150',
    name: 'Event Catering Pack (150+ Pieces)',
    category: 'party-packs',
    price: 48000,
    description: 'Grand event platter for office activations and corporate parties with premium live-box packaging.',
    image: '/assets/hero.jpg',
    tag: 'Event Scale',
    prepTime: '45 mins',
    calories: '150+ Pieces',
    rating: 5.0,
    reviews: 45
  },

  // DESSERTS
  {
    id: 'dessert-brownie-parfait',
    name: 'Fudge Brownie Parfait Jar',
    category: 'desserts',
    price: 3800,
    description: 'Chewy Belgian chocolate brownie chunks layered with dark chocolate ganache and vanilla whipped cream.',
    image: '/assets/desserts.jpg',
    tag: 'Chocolate Lover',
    prepTime: '5 mins',
    calories: '440 kcal',
    rating: 4.9,
    reviews: 155
  },
  {
    id: 'dessert-oreo-delight',
    name: 'Oreo Cookies & Cream Cup',
    category: 'desserts',
    price: 3200,
    description: 'Crushed Oreo cookie crust layered with creamy cheesecake mousse and mini Oreo toppers.',
    image: '/assets/desserts.jpg',
    tag: 'Kids & Adults',
    prepTime: '5 mins',
    calories: '390 kcal',
    rating: 4.8,
    reviews: 110
  },
  {
    id: 'dessert-cheesecake-cup',
    name: 'Strawberry Swirl Cheesecake Cup',
    category: 'desserts',
    price: 3500,
    description: 'Silky smooth New York style cheesecake mousse over graham cracker base with fresh strawberry reduction.',
    image: '/assets/desserts.jpg',
    tag: 'Creamy',
    prepTime: '5 mins',
    calories: '360 kcal',
    rating: 4.9,
    reviews: 98
  },
  {
    id: 'dessert-cupcake-trio',
    name: 'Artisanal Cupcake Trio (3 pcs)',
    category: 'desserts',
    price: 3600,
    description: 'Three gourmet cupcakes: Salted Caramel, Red Velvet, and Madagascar Vanilla with gold sprinkles.',
    image: '/assets/desserts.jpg',
    tag: 'Trio Pack',
    prepTime: '5 mins',
    calories: '420 kcal',
    rating: 4.8,
    reviews: 74
  },

  // SPECIALTY SIGNATURE DRINKS
  {
    id: 'spec-berry-bliss',
    name: 'Berry Bliss Mocktail',
    category: 'specialty',
    price: 2500,
    description: 'Crushed blackberries, raspberries, and sparkling cranberry with fresh mint and lime squeeze.',
    image: '/assets/beverages.jpg',
    tag: 'Refreshing',
    prepTime: '5 mins',
    calories: '125 kcal',
    rating: 4.9,
    reviews: 140
  },
  {
    id: 'spec-mango-passion',
    name: 'Mango Passion Sparkler',
    category: 'specialty',
    price: 2500,
    description: 'Ripe mango puree blended with tart passionfruit and sparkling club soda over crushed ice.',
    image: '/assets/beverages.jpg',
    tag: 'Tropical',
    prepTime: '5 mins',
    calories: '135 kcal',
    rating: 4.9,
    reviews: 125
  },
  {
    id: 'spec-citrus-crush',
    name: 'Citrus Crush Botanical',
    category: 'specialty',
    price: 2200,
    description: 'Zesty blend of freshly squeezed orange, pink grapefruit, lemon balm, and tonic water.',
    image: '/assets/beverages.jpg',
    tag: 'Zesty',
    prepTime: '5 mins',
    calories: '110 kcal',
    rating: 4.8,
    reviews: 89
  },

  // REFRESHERS
  {
    id: 'ref-chapman',
    name: 'Classic Nigerian Chapman',
    category: 'refreshers',
    price: 2000,
    description: 'Authentic Nigerian Chapman infused with Angostura bitters, Fanta, Sprite, cucumber, and citrus wheels.',
    image: '/assets/beverages.jpg',
    tag: 'Traditional',
    prepTime: '5 mins',
    calories: '140 kcal',
    rating: 5.0,
    reviews: 310
  },
  {
    id: 'ref-virgin-mojito',
    name: 'Crisp Virgin Mojito',
    category: 'refreshers',
    price: 2200,
    description: 'Muddled fresh garden mint, raw cane sugar, freshly squeezed lime juice, and effervescent sparkling water.',
    image: '/assets/beverages.jpg',
    tag: 'Cooling',
    prepTime: '5 mins',
    calories: '90 kcal',
    rating: 4.9,
    reviews: 115
  },
  {
    id: 'ref-strawberry-lemonade',
    name: 'Fresh Strawberry Lemonade',
    category: 'refreshers',
    price: 2200,
    description: 'House-made tart lemonade infused with crushed sweet strawberry puree and basil.',
    image: '/assets/beverages.jpg',
    tag: 'Sweet & Tart',
    prepTime: '5 mins',
    calories: '130 kcal',
    rating: 4.8,
    reviews: 95
  },
  {
    id: 'ref-fresh-orange',
    name: 'Cold-Pressed Valencia Orange Juice',
    category: 'refreshers',
    price: 2000,
    description: '100% pure cold-pressed Valencia oranges. No added sugar or preservatives.',
    image: '/assets/beverages.jpg',
    tag: '100% Pure',
    prepTime: '3 mins',
    calories: '110 kcal',
    rating: 4.9,
    reviews: 135
  },

  // COFFEE BAR
  {
    id: 'coffee-caramel-latte',
    name: 'Iced / Hot Caramel Latte',
    category: 'coffee',
    price: 2600,
    description: 'Double shot of dark espresso, silky steamed whole milk, and house salted caramel drizzle.',
    image: '/assets/hero.jpg',
    tag: 'Barista Choice',
    prepTime: '5 mins',
    calories: '190 kcal',
    rating: 4.9,
    reviews: 120
  },
  {
    id: 'coffee-cappuccino',
    name: 'Artisan Cappuccino',
    category: 'coffee',
    price: 2200,
    description: 'Rich espresso topped with thick velvety microfoam and dusted with dark cocoa powder.',
    image: '/assets/hero.jpg',
    tag: 'Classic Brew',
    prepTime: '5 mins',
    calories: '130 kcal',
    rating: 4.8,
    reviews: 88
  },
  {
    id: 'coffee-hot-chocolate',
    name: 'Belgian Hot Chocolate',
    category: 'coffee',
    price: 2500,
    description: 'Melted Belgian milk and dark chocolate whipped with steamed whole milk and mini marshmallows.',
    image: '/assets/hero.jpg',
    tag: 'Warm Comfort',
    prepTime: '5 mins',
    calories: '280 kcal',
    rating: 5.0,
    reviews: 105
  }
];

export const BOX_SIZES = [
  { id: 'mini', name: 'Mini Box', itemsCount: '6 Chops + 1 Drink', price: 4500, desc: 'Personal indulgence or quick snack' },
  { id: 'regular', name: 'The Tchow Box (Regular)', itemsCount: '12 Chops + 1 Drink + 1 Parfait', price: 6500, desc: 'Our most popular full experience box', popular: true },
  { id: 'premium', name: 'Premium Box (For 2)', itemsCount: '20 Chops + 2 Drinks + 2 Parfaits', price: 12000, desc: 'Perfect for couples, date mornings or gifting' },
  { id: 'mega', name: 'Mega Party Box', itemsCount: '40 Chops + 4 Drinks + 4 Parfaits', price: 22000, desc: 'For family weekend gatherings & small teams' }
];

export const INVESTOR_TIERS = [
  {
    id: 'fixed',
    icon: 'Cake',
    title: 'Fixed Return Investment',
    target: 'Predictable Returns',
    description: 'For investors seeking predictable, guaranteed capital ROI on defined repayment timelines without equity dilution.',
    features: [
      'Agreed investment tranches (from ₦200,000)',
      'Fixed annualized ROI (25% p.a.)',
      'Defined scheduled repayment timeline',
      'Non-dilutive legal agreement'
    ],
    recommended: false,
    ctaText: 'Select Fixed ROI'
  },
  {
    id: 'revenue',
    icon: 'TrendingUp',
    title: 'Performance / Revenue Share',
    target: 'Growth-Tied Returns',
    description: 'Participate directly in Tchow’s monthly gross sales turnover velocity and rapid brand expansion.',
    features: [
      'Percentage-based quarterly cash distributions',
      'Direct upside aligned with commercial volume',
      'Target performance returns up to ~35% p.a.',
      'Quarterly operational & financial disclosures'
    ],
    recommended: true,
    ctaText: 'Join Growth Share'
  },
  {
    id: 'equity',
    icon: 'Handshake',
    title: 'Equity & Strategic Co-Ownership',
    target: 'Long-Term Brand Valuation',
    description: 'For high-conviction partners investing in long-term enterprise valuation, retail products, and physical café rollout.',
    features: [
      'Direct equity shares in Tchow corporate entity',
      'Participation in multi-location expansion upside',
      'Strategic alignment & advisory updates',
      'Priority expansion & franchise participation'
    ],
    recommended: false,
    ctaText: 'Discuss Strategic Equity'
  },
  {
    id: 'asset',
    icon: 'Settings',
    title: 'Asset & Kitchen Equipment Partner',
    target: 'Tangible Asset Backing',
    description: 'Support production scaling through commercial kitchen, automated baking, or beverage equipment provision.',
    features: [
      'Industrial baking & beverage equipment financing',
      'Asset-backed security & lease agreements',
      'Continuous monthly equipment lease yield',
      'Direct asset depreciation benefits'
    ],
    recommended: false,
    ctaText: 'Partner with Assets'
  }
];

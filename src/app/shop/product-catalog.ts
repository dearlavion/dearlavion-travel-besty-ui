// Copied verbatim from travel-shop-page.html's mockup <script> — "use mockup data for now".
// `id` slugs were added on top of the mockup data so individual products have stable,
// linkable routes (the static mockup had no per-product page at all).
export type ProductSeason = 'All' | 'Summer' | 'Winter' | 'Rainy';
export type ProductDestination = 'All' | 'Beach' | 'Mountain' | 'City';

export interface Product {
  id: string;
  name: string;
  category: string;
  season: ProductSeason;
  destination: ProductDestination;
  price: number;
  popular: boolean;
  icon: string;
  desc: string;
  stock: number;
  soldOut: boolean;
}

export const PRODUCTS: Product[] = [
  { id: 'passport-wallet', name: 'Passport Wallet', category: 'Documents', season: 'All', destination: 'All', price: 18.0, popular: true, icon: '📘', desc: 'Slim RFID-blocking travel document wallet.', stock: 42, soldOut: false },
  { id: 'fast-charge-cable-set', name: 'Fast-Charge Cable Set', category: 'Electronics', season: 'All', destination: 'All', price: 14.5, popular: true, icon: '🔌', desc: 'Durable braided cables, phone + tablet compatible.', stock: 58, soldOut: false },
  { id: 'travel-medication-case', name: 'Travel Medication Case', category: 'Health', season: 'All', destination: 'All', price: 9.99, popular: false, icon: '💊', desc: 'Labeled daily compartments for on-the-go meds.', stock: 33, soldOut: false },
  { id: 'compact-first-aid-kit', name: 'Compact First-Aid Kit', category: 'Health', season: 'All', destination: 'All', price: 16.0, popular: true, icon: '🩹', desc: 'Bandages, antiseptic, and essentials in one pouch.', stock: 47, soldOut: false },
  { id: 'document-organizer-wallet', name: 'Document Organizer Wallet', category: 'Documents', season: 'All', destination: 'All', price: 22.0, popular: false, icon: '📄', desc: 'Keeps tickets, ID, and cards in one place.', stock: 19, soldOut: false },

  { id: 'ripple-swimsuit', name: 'Ripple Swimsuit', category: 'Clothing', season: 'Summer', destination: 'Beach', price: 34.0, popular: true, icon: '🩱', desc: 'Quick-dry, chlorine-resistant everyday swimsuit.', stock: 24, soldOut: false },
  { id: 'quick-dry-mini-towel', name: 'Quick-Dry Mini Towel', category: 'Comfort', season: 'Summer', destination: 'Beach', price: 12.0, popular: true, icon: '🏖️', desc: "Packs small, dries fast, sand won't stick.", stock: 61, soldOut: false },
  { id: 'woven-flip-flops', name: 'Woven Flip-Flops', category: 'Clothing', season: 'Summer', destination: 'Beach', price: 19.5, popular: false, icon: '🩴', desc: 'Lightweight sandals for sand and boardwalk.', stock: 38, soldOut: false },
  { id: 'waterproof-phone-pouch', name: 'Waterproof Phone Pouch', category: 'Electronics', season: 'Summer', destination: 'Beach', price: 8.5, popular: false, icon: '📱', desc: 'Keeps your phone dry and usable in the water.', stock: 52, soldOut: false },
  { id: 'after-sun-aloe-gel', name: 'After-Sun Aloe Gel', category: 'Toiletries', season: 'Summer', destination: 'Beach', price: 11.0, popular: false, icon: '🌿', desc: 'Cooling relief for sun-warmed skin.', stock: 27, soldOut: false },

  { id: 'trailhead-hiking-boots', name: 'Trailhead Hiking Boots', category: 'Clothing', season: 'All', destination: 'Mountain', price: 89.0, popular: true, icon: '🥾', desc: 'Ankle support and grip for uneven terrain.', stock: 14, soldOut: false },
  { id: 'carbon-trekking-poles', name: 'Carbon Trekking Poles', category: 'Gear', season: 'All', destination: 'Mountain', price: 42.0, popular: false, icon: '🥢', desc: 'Collapsible poles for steep or long trails.', stock: 21, soldOut: false },
  { id: 'ridgeline-daypack-18l', name: 'Ridgeline Daypack 18L', category: 'Gear', season: 'All', destination: 'Mountain', price: 38.0, popular: true, icon: '🎒', desc: 'Just enough room for a day on the trail.', stock: 29, soldOut: false },
  { id: 'insect-repellent-spray', name: 'Insect Repellent Spray', category: 'Toiletries', season: 'All', destination: 'Mountain', price: 7.5, popular: false, icon: '🦟', desc: 'DEET-free formula, travel-size.', stock: 64, soldOut: false },
  { id: 'rechargeable-headlamp', name: 'Rechargeable Headlamp', category: 'Electronics', season: 'All', destination: 'Mountain', price: 24.0, popular: false, icon: '🔦', desc: 'Hands-free light for early starts or camp.', stock: 18, soldOut: false },

  { id: 'everyday-walking-sneakers', name: 'Everyday Walking Sneakers', category: 'Clothing', season: 'All', destination: 'City', price: 64.0, popular: true, icon: '👟', desc: 'All-day comfort for cobblestones and subways.', stock: 16, soldOut: false },
  { id: 'crossbody-city-bag', name: 'Crossbody City Bag', category: 'Gear', season: 'All', destination: 'City', price: 36.0, popular: true, icon: '👜', desc: 'Anti-theft zip, fits phone, wallet, and a map.', stock: 23, soldOut: false },
  { id: 'slim-power-bank-10000mah', name: 'Slim Power Bank 10000mAh', category: 'Electronics', season: 'All', destination: 'City', price: 27.0, popular: true, icon: '🔋', desc: 'A full charge for a long day of exploring.', stock: 40, soldOut: false },
  { id: 'offline-city-map-pack', name: 'Offline City Map Pack', category: 'Electronics', season: 'All', destination: 'City', price: 4.99, popular: false, icon: '🗺️', desc: 'Pre-downloaded maps, no data needed.', stock: 99, soldOut: false },
  { id: 'foldable-laundry-bag', name: 'Foldable Laundry Bag', category: 'Comfort', season: 'All', destination: 'City', price: 9.0, popular: false, icon: '🧺', desc: 'Keeps worn clothes separate, packs flat.', stock: 31, soldOut: false },

  { id: '50ml-sunscreen-spf50', name: '50ml Sunscreen SPF50', category: 'Toiletries', season: 'Summer', destination: 'All', price: 9.5, popular: true, icon: '🧴', desc: 'Travel-size, reef-safe, broad spectrum.', stock: 55, soldOut: false },
  { id: 'polarized-sunglasses', name: 'Polarized Sunglasses', category: 'Accessories', season: 'Summer', destination: 'All', price: 29.0, popular: true, icon: '🕶️', desc: 'UV protection with a lightweight frame.', stock: 26, soldOut: false },
  { id: 'packable-wide-brim-hat', name: 'Packable Wide-Brim Hat', category: 'Accessories', season: 'Summer', destination: 'All', price: 21.0, popular: false, icon: '👒', desc: 'Folds flat, springs back into shape.', stock: 20, soldOut: false },
  { id: 'breathable-linen-set', name: 'Breathable Linen Set', category: 'Clothing', season: 'Summer', destination: 'All', price: 45.0, popular: false, icon: '👕', desc: 'Lightweight layers for hot, humid days.', stock: 12, soldOut: false },
  { id: 'cooling-neck-towel', name: 'Cooling Neck Towel', category: 'Comfort', season: 'Summer', destination: 'All', price: 10.5, popular: false, icon: '🧣', desc: 'Activates with water, stays cool for hours.', stock: 44, soldOut: false },

  { id: 'thermal-base-layer-set', name: 'Thermal Base Layer Set', category: 'Clothing', season: 'Winter', destination: 'All', price: 39.0, popular: true, icon: '🥼', desc: 'Moisture-wicking layer for cold climates.', stock: 17, soldOut: false },
  { id: 'insulated-touch-gloves', name: 'Insulated Touch Gloves', category: 'Accessories', season: 'Winter', destination: 'All', price: 18.0, popular: false, icon: '🧤', desc: 'Stay warm without taking them off for your phone.', stock: 30, soldOut: false },
  { id: 'ribbed-wool-beanie', name: 'Ribbed Wool Beanie', category: 'Accessories', season: 'Winter', destination: 'All', price: 15.0, popular: false, icon: '🧢', desc: 'Soft merino wool, packs into a pocket.', stock: 35, soldOut: false },
  { id: 'lip-skin-balm-duo', name: 'Lip & Skin Balm Duo', category: 'Toiletries', season: 'Winter', destination: 'All', price: 8.0, popular: false, icon: '💄', desc: 'Protects against wind and dry cabin air.', stock: 48, soldOut: false },
  { id: 'merino-wool-socks-2pk', name: 'Merino Wool Socks (2pk)', category: 'Clothing', season: 'Winter', destination: 'All', price: 16.5, popular: true, icon: '🧦', desc: 'Warm, odor-resistant, all-day comfort.', stock: 53, soldOut: false },

  { id: 'packable-rain-jacket', name: 'Packable Rain Jacket', category: 'Clothing', season: 'Rainy', destination: 'All', price: 48.0, popular: true, icon: '🧥', desc: 'Waterproof shell that folds into its own pocket.', stock: 13, soldOut: false },
  { id: 'compact-travel-umbrella', name: 'Compact Travel Umbrella', category: 'Gear', season: 'Rainy', destination: 'All', price: 14.0, popular: true, icon: '☂️', desc: 'Windproof frame, fits in a daypack pocket.', stock: 45, soldOut: false },
  { id: 'waterproof-shoe-covers', name: 'Waterproof Shoe Covers', category: 'Gear', season: 'Rainy', destination: 'All', price: 11.0, popular: false, icon: '👢', desc: 'Slip over any shoe to keep feet dry.', stock: 28, soldOut: false },
  { id: 'electronics-dry-bag', name: 'Electronics Dry Bag', category: 'Electronics', season: 'Rainy', destination: 'All', price: 13.5, popular: false, icon: '💧', desc: 'Roll-top seal keeps devices safe from rain.', stock: 36, soldOut: false },
  { id: 'quick-dry-travel-set', name: 'Quick-Dry Travel Set', category: 'Clothing', season: 'Rainy', destination: 'All', price: 32.0, popular: false, icon: '👚', desc: 'Dries overnight even in humid conditions.', stock: 15, soldOut: false },

  { id: 'personal-safety-whistle', name: 'Personal Safety Whistle', category: 'Gear', season: 'All', destination: 'All', price: 6.0, popular: false, icon: '🔔', desc: 'Lightweight, loud, and easy to clip on.', stock: 70, soldOut: false },
  { id: 'portable-door-alarm', name: 'Portable Door Alarm', category: 'Gear', season: 'All', destination: 'All', price: 17.0, popular: false, icon: '🚪', desc: 'Extra peace of mind for solo stays.', stock: 22, soldOut: false },
  { id: 'travel-esim-card', name: 'Travel eSIM Card', category: 'Electronics', season: 'All', destination: 'All', price: 19.99, popular: true, icon: '📶', desc: 'Stay connected the moment you land.', stock: 999, soldOut: false },

  { id: 'group-first-aid-kit-large', name: 'Group First-Aid Kit (Large)', category: 'Health', season: 'All', destination: 'All', price: 28.0, popular: false, icon: '🧰', desc: 'Sized for 4-6 travelers, restockable.', stock: 11, soldOut: false },
  { id: 'printed-itinerary-set', name: 'Printed Itinerary Set', category: 'Documents', season: 'All', destination: 'All', price: 5.0, popular: false, icon: '🗒️', desc: 'Shareable printed copies for the whole group.', stock: 63, soldOut: false },
  { id: 'multi-port-charging-hub', name: 'Multi-Port Charging Hub', category: 'Electronics', season: 'All', destination: 'All', price: 33.0, popular: true, icon: '🔌', desc: 'Charge up to 6 devices from one outlet.', stock: 25, soldOut: false },

  { id: 'travel-size-toiletry-kit', name: 'Travel-Size Toiletry Kit', category: 'Toiletries', season: 'All', destination: 'All', price: 15.0, popular: true, icon: '🧴', desc: 'TSA-friendly bottles, refillable and reusable.', stock: 57, soldOut: false },
  { id: 'versatile-spare-outfit', name: 'Versatile Spare Outfit', category: 'Clothing', season: 'All', destination: 'All', price: 26.0, popular: false, icon: '👕', desc: 'One extra outfit that pairs with everything.', stock: 19, soldOut: false },

  { id: 'laundry-detergent-sheets', name: 'Laundry Detergent Sheets', category: 'Toiletries', season: 'All', destination: 'All', price: 7.0, popular: false, icon: '🧼', desc: 'Featherlight sheets, no liquid spills.', stock: 66, soldOut: false },
  { id: 'packing-cubes-set-of-3', name: 'Packing Cubes (Set of 3)', category: 'Gear', season: 'All', destination: 'All', price: 24.0, popular: true, icon: '🧳', desc: 'Compress and organize by outfit or category.', stock: 34, soldOut: false },
  { id: 'universal-travel-adapter', name: 'Universal Travel Adapter', category: 'Electronics', season: 'All', destination: 'All', price: 21.0, popular: true, icon: '🔋', desc: 'Works in 150+ countries, built-in USB ports.', stock: 41, soldOut: false },

  { id: 'reusable-laundry-bag', name: 'Reusable Laundry Bag', category: 'Comfort', season: 'All', destination: 'All', price: 8.5, popular: false, icon: '🧺', desc: 'Mesh bag for longer stays between washes.', stock: 32, soldOut: false },
  { id: 'extended-medication-organizer', name: 'Extended Medication Organizer', category: 'Health', season: 'All', destination: 'All', price: 12.5, popular: false, icon: '💊', desc: 'A full month of daily compartments.', stock: 9, soldOut: false },
  { id: 'packing-cubes-full-set', name: 'Packing Cubes (Full Set)', category: 'Gear', season: 'All', destination: 'All', price: 34.0, popular: false, icon: '🧳', desc: 'Complete system for extended travel.', stock: 0, soldOut: true },
  { id: 'foldable-spare-duffel', name: 'Foldable Spare Duffel', category: 'Gear', season: 'All', destination: 'All', price: 19.0, popular: true, icon: '🎒', desc: 'Packs flat, unfolds for souvenirs on the way home.', stock: 20, soldOut: false },
];

const DESTINATION_TINT: Partial<Record<ProductDestination, string>> = {
  Beach: 'var(--tint-yellow)',
  Mountain: 'var(--tint-green)',
  City: 'var(--tint-blue)',
};

const SEASON_TINT: Record<ProductSeason, string> = {
  Summer: 'var(--tint-marigold)',
  Winter: 'var(--tint-lavender)',
  Rainy: 'var(--tint-green)',
  All: 'var(--tint-cream)',
};

// Shared with ProductDetailComponent so the shop grid and the product page agree on tinting.
export function getProductTint(product: Product): string {
  if (product.popular) return 'var(--tint-violet)';
  return DESTINATION_TINT[product.destination] ?? SEASON_TINT[product.season] ?? 'var(--tint-cream)';
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

// Same category first, then same destination/season, excluding the product itself.
export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const others = PRODUCTS.filter((p) => p.id !== product.id);

  const sameCategory = others.filter((p) => p.category === product.category);
  const sameTrip = others.filter(
    (p) =>
      p.category !== product.category &&
      ((product.destination !== 'All' && p.destination === product.destination) ||
        (product.season !== 'All' && p.season === product.season)),
  );

  return [...sameCategory, ...sameTrip].slice(0, limit);
}

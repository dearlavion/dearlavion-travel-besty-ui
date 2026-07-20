// Originally copied verbatim from travel-shop-page.html's mockup <script> ("use mockup data for
// now"), then reshaped to match the real backend's Product model field-for-field (description,
// seasons/destinations/parties as arrays, currency, tested, image, active) while staying mock-data/
// localStorage-only — see the model-alignment plan for the full rationale.
export type ProductSeason = 'Summer' | 'Winter' | 'Rainy';
export type ProductDestination = 'Beach' | 'Mountain' | 'City';
export type ProductParty = 'Solo' | 'Group';

export interface Product {
  id: string; // mock mode: a slug (this app's routing key). Real-backend mode: the backend's own
  // Mongo id (required by admin update/delete) — see `slug` below for the readable identifier.
  slug?: string; // real-backend mode only. PopularKit.productIds/linkedProductIds reference
  // products by slug, not the Mongo id — ProductCatalogService.getById() checks both.
  name: string;
  category: string;
  description: string;
  seasons: ProductSeason[]; // [] = unrestricted/all seasons
  destinations: ProductDestination[]; // [] = unrestricted/all destinations
  parties: ProductParty[]; // [] = unrestricted/all party sizes
  price: number;
  currency: string;
  popular: boolean;
  tested: boolean;
  image?: string;
  icon: string;
  active: boolean; // publish/visibility — independent of stock/soldOut
  stock: number; // frontend-only inventory concept, backend doesn't model this yet
  soldOut: boolean; // frontend-only; listed but temporarily unavailable to buy
  linkedProductIds?: string[]; // admin-curated explicit "suggested with" links — take priority
  // over ProductCatalogService.getRelated()'s automatic category/trip matching in My Kit's
  // suggestions panel. Undefined/omitted on most seed products = no manual overrides, same as [].
}

export const PRODUCTS: Product[] = [
  { id: 'passport-wallet', name: 'Passport Wallet', category: 'Documents', seasons: [], destinations: [], parties: [], price: 18.0, currency: 'USD', popular: true, tested: true, icon: '📘', active: true, description: 'Slim RFID-blocking travel document wallet.', stock: 42, soldOut: false },
  { id: 'fast-charge-cable-set', name: 'Fast-Charge Cable Set', category: 'Electronics', seasons: [], destinations: [], parties: [], price: 14.5, currency: 'USD', popular: true, tested: true, icon: '🔌', active: true, description: 'Durable braided cables, phone + tablet compatible.', stock: 58, soldOut: false },
  { id: 'travel-medication-case', name: 'Travel Medication Case', category: 'Health', seasons: [], destinations: [], parties: [], price: 9.99, currency: 'USD', popular: false, tested: true, icon: '💊', active: true, description: 'Labeled daily compartments for on-the-go meds.', stock: 33, soldOut: false },
  { id: 'compact-first-aid-kit', name: 'Compact First-Aid Kit', category: 'Health', seasons: [], destinations: [], parties: [], price: 16.0, currency: 'USD', popular: true, tested: true, icon: '🩹', active: true, description: 'Bandages, antiseptic, and essentials in one pouch.', stock: 47, soldOut: false },
  { id: 'document-organizer-wallet', name: 'Document Organizer Wallet', category: 'Documents', seasons: [], destinations: [], parties: [], price: 22.0, currency: 'USD', popular: false, tested: true, icon: '📄', active: true, description: 'Keeps tickets, ID, and cards in one place.', stock: 19, soldOut: false },

  { id: 'ripple-swimsuit', name: 'Ripple Swimsuit', category: 'Clothing', seasons: ['Summer'], destinations: ['Beach'], parties: [], price: 34.0, currency: 'USD', popular: true, tested: true, icon: '🩱', active: true, description: 'Quick-dry, chlorine-resistant everyday swimsuit.', stock: 24, soldOut: false },
  { id: 'quick-dry-mini-towel', name: 'Quick-Dry Mini Towel', category: 'Comfort', seasons: ['Summer'], destinations: ['Beach'], parties: [], price: 12.0, currency: 'USD', popular: true, tested: true, icon: '🏖️', active: true, description: "Packs small, dries fast, sand won't stick.", stock: 61, soldOut: false },
  { id: 'woven-flip-flops', name: 'Woven Flip-Flops', category: 'Clothing', seasons: ['Summer'], destinations: ['Beach'], parties: [], price: 19.5, currency: 'USD', popular: false, tested: true, icon: '🩴', active: true, description: 'Lightweight sandals for sand and boardwalk.', stock: 38, soldOut: false },
  { id: 'waterproof-phone-pouch', name: 'Waterproof Phone Pouch', category: 'Electronics', seasons: ['Summer'], destinations: ['Beach'], parties: [], price: 8.5, currency: 'USD', popular: false, tested: true, icon: '📱', active: true, description: 'Keeps your phone dry and usable in the water.', stock: 52, soldOut: false },
  { id: 'after-sun-aloe-gel', name: 'After-Sun Aloe Gel', category: 'Toiletries', seasons: ['Summer'], destinations: ['Beach'], parties: [], price: 11.0, currency: 'USD', popular: false, tested: true, icon: '🌿', active: true, description: 'Cooling relief for sun-warmed skin.', stock: 27, soldOut: false },

  { id: 'trailhead-hiking-boots', name: 'Trailhead Hiking Boots', category: 'Clothing', seasons: [], destinations: ['Mountain'], parties: [], price: 89.0, currency: 'USD', popular: true, tested: true, icon: '🥾', active: true, description: 'Ankle support and grip for uneven terrain.', stock: 14, soldOut: false },
  { id: 'carbon-trekking-poles', name: 'Carbon Trekking Poles', category: 'Gear', seasons: [], destinations: ['Mountain'], parties: [], price: 42.0, currency: 'USD', popular: false, tested: true, icon: '🥢', active: true, description: 'Collapsible poles for steep or long trails.', stock: 21, soldOut: false },
  { id: 'ridgeline-daypack-18l', name: 'Ridgeline Daypack 18L', category: 'Gear', seasons: [], destinations: ['Mountain'], parties: [], price: 38.0, currency: 'USD', popular: true, tested: true, icon: '🎒', active: true, description: 'Just enough room for a day on the trail.', stock: 29, soldOut: false },
  { id: 'insect-repellent-spray', name: 'Insect Repellent Spray', category: 'Toiletries', seasons: [], destinations: ['Mountain'], parties: [], price: 7.5, currency: 'USD', popular: false, tested: true, icon: '🦟', active: true, description: 'DEET-free formula, travel-size.', stock: 64, soldOut: false },
  { id: 'rechargeable-headlamp', name: 'Rechargeable Headlamp', category: 'Electronics', seasons: [], destinations: ['Mountain'], parties: [], price: 24.0, currency: 'USD', popular: false, tested: true, icon: '🔦', active: true, description: 'Hands-free light for early starts or camp.', stock: 18, soldOut: false },

  { id: 'everyday-walking-sneakers', name: 'Everyday Walking Sneakers', category: 'Clothing', seasons: [], destinations: ['City'], parties: [], price: 64.0, currency: 'USD', popular: true, tested: true, icon: '👟', active: true, description: 'All-day comfort for cobblestones and subways.', stock: 16, soldOut: false },
  { id: 'crossbody-city-bag', name: 'Crossbody City Bag', category: 'Gear', seasons: [], destinations: ['City'], parties: [], price: 36.0, currency: 'USD', popular: true, tested: true, icon: '👜', active: true, description: 'Anti-theft zip, fits phone, wallet, and a map.', stock: 23, soldOut: false },
  { id: 'slim-power-bank-10000mah', name: 'Slim Power Bank 10000mAh', category: 'Electronics', seasons: [], destinations: ['City'], parties: [], price: 27.0, currency: 'USD', popular: true, tested: true, icon: '🔋', active: true, description: 'A full charge for a long day of exploring.', stock: 40, soldOut: false },
  { id: 'offline-city-map-pack', name: 'Offline City Map Pack', category: 'Electronics', seasons: [], destinations: ['City'], parties: [], price: 4.99, currency: 'USD', popular: false, tested: true, icon: '🗺️', active: true, description: 'Pre-downloaded maps, no data needed.', stock: 99, soldOut: false },
  { id: 'foldable-laundry-bag', name: 'Foldable Laundry Bag', category: 'Comfort', seasons: [], destinations: ['City'], parties: [], price: 9.0, currency: 'USD', popular: false, tested: true, icon: '🧺', active: true, description: 'Keeps worn clothes separate, packs flat.', stock: 31, soldOut: false },

  { id: '50ml-sunscreen-spf50', name: '50ml Sunscreen SPF50', category: 'Toiletries', seasons: ['Summer'], destinations: [], parties: [], price: 9.5, currency: 'USD', popular: true, tested: true, icon: '🧴', active: true, description: 'Travel-size, reef-safe, broad spectrum.', stock: 55, soldOut: false },
  { id: 'polarized-sunglasses', name: 'Polarized Sunglasses', category: 'Accessories', seasons: ['Summer'], destinations: [], parties: [], price: 29.0, currency: 'USD', popular: true, tested: true, icon: '🕶️', active: true, description: 'UV protection with a lightweight frame.', stock: 26, soldOut: false },
  { id: 'packable-wide-brim-hat', name: 'Packable Wide-Brim Hat', category: 'Accessories', seasons: ['Summer'], destinations: [], parties: [], price: 21.0, currency: 'USD', popular: false, tested: true, icon: '👒', active: true, description: 'Folds flat, springs back into shape.', stock: 20, soldOut: false },
  { id: 'breathable-linen-set', name: 'Breathable Linen Set', category: 'Clothing', seasons: ['Summer'], destinations: [], parties: [], price: 45.0, currency: 'USD', popular: false, tested: true, icon: '👕', active: true, description: 'Lightweight layers for hot, humid days.', stock: 12, soldOut: false },
  { id: 'cooling-neck-towel', name: 'Cooling Neck Towel', category: 'Comfort', seasons: ['Summer'], destinations: [], parties: [], price: 10.5, currency: 'USD', popular: false, tested: true, icon: '🧣', active: true, description: 'Activates with water, stays cool for hours.', stock: 44, soldOut: false },

  { id: 'thermal-base-layer-set', name: 'Thermal Base Layer Set', category: 'Clothing', seasons: ['Winter'], destinations: [], parties: [], price: 39.0, currency: 'USD', popular: true, tested: true, icon: '🥼', active: true, description: 'Moisture-wicking layer for cold climates.', stock: 17, soldOut: false },
  { id: 'insulated-touch-gloves', name: 'Insulated Touch Gloves', category: 'Accessories', seasons: ['Winter'], destinations: [], parties: [], price: 18.0, currency: 'USD', popular: false, tested: true, icon: '🧤', active: true, description: 'Stay warm without taking them off for your phone.', stock: 30, soldOut: false },
  { id: 'ribbed-wool-beanie', name: 'Ribbed Wool Beanie', category: 'Accessories', seasons: ['Winter'], destinations: [], parties: [], price: 15.0, currency: 'USD', popular: false, tested: true, icon: '🧢', active: true, description: 'Soft merino wool, packs into a pocket.', stock: 35, soldOut: false },
  { id: 'lip-skin-balm-duo', name: 'Lip & Skin Balm Duo', category: 'Toiletries', seasons: ['Winter'], destinations: [], parties: [], price: 8.0, currency: 'USD', popular: false, tested: true, icon: '💄', active: true, description: 'Protects against wind and dry cabin air.', stock: 48, soldOut: false },
  { id: 'merino-wool-socks-2pk', name: 'Merino Wool Socks (2pk)', category: 'Clothing', seasons: ['Winter'], destinations: [], parties: [], price: 16.5, currency: 'USD', popular: true, tested: true, icon: '🧦', active: true, description: 'Warm, odor-resistant, all-day comfort.', stock: 53, soldOut: false },

  { id: 'packable-rain-jacket', name: 'Packable Rain Jacket', category: 'Clothing', seasons: ['Rainy'], destinations: [], parties: [], price: 48.0, currency: 'USD', popular: true, tested: true, icon: '🧥', active: true, description: 'Waterproof shell that folds into its own pocket.', stock: 13, soldOut: false },
  { id: 'compact-travel-umbrella', name: 'Compact Travel Umbrella', category: 'Gear', seasons: ['Rainy'], destinations: [], parties: [], price: 14.0, currency: 'USD', popular: true, tested: true, icon: '☂️', active: true, description: 'Windproof frame, fits in a daypack pocket.', stock: 45, soldOut: false },
  { id: 'waterproof-shoe-covers', name: 'Waterproof Shoe Covers', category: 'Gear', seasons: ['Rainy'], destinations: [], parties: [], price: 11.0, currency: 'USD', popular: false, tested: true, icon: '👢', active: true, description: 'Slip over any shoe to keep feet dry.', stock: 28, soldOut: false },
  { id: 'electronics-dry-bag', name: 'Electronics Dry Bag', category: 'Electronics', seasons: ['Rainy'], destinations: [], parties: [], price: 13.5, currency: 'USD', popular: false, tested: true, icon: '💧', active: true, description: 'Roll-top seal keeps devices safe from rain.', stock: 36, soldOut: false },
  { id: 'quick-dry-travel-set', name: 'Quick-Dry Travel Set', category: 'Clothing', seasons: ['Rainy'], destinations: [], parties: [], price: 32.0, currency: 'USD', popular: false, tested: true, icon: '👚', active: true, description: 'Dries overnight even in humid conditions.', stock: 15, soldOut: false },

  { id: 'personal-safety-whistle', name: 'Personal Safety Whistle', category: 'Gear', seasons: [], destinations: [], parties: [], price: 6.0, currency: 'USD', popular: false, tested: true, icon: '🔔', active: true, description: 'Lightweight, loud, and easy to clip on.', stock: 70, soldOut: false },
  { id: 'portable-door-alarm', name: 'Portable Door Alarm', category: 'Gear', seasons: [], destinations: [], parties: [], price: 17.0, currency: 'USD', popular: false, tested: true, icon: '🚪', active: true, description: 'Extra peace of mind for solo stays.', stock: 22, soldOut: false },
  { id: 'travel-esim-card', name: 'Travel eSIM Card', category: 'Electronics', seasons: [], destinations: [], parties: [], price: 19.99, currency: 'USD', popular: true, tested: true, icon: '📶', active: true, description: 'Stay connected the moment you land.', stock: 999, soldOut: false },

  { id: 'group-first-aid-kit-large', name: 'Group First-Aid Kit (Large)', category: 'Health', seasons: [], destinations: [], parties: ['Group'], price: 28.0, currency: 'USD', popular: false, tested: true, icon: '🧰', active: true, description: 'Sized for 4-6 travelers, restockable.', stock: 11, soldOut: false },
  { id: 'printed-itinerary-set', name: 'Printed Itinerary Set', category: 'Documents', seasons: [], destinations: [], parties: ['Group'], price: 5.0, currency: 'USD', popular: false, tested: true, icon: '🗒️', active: true, description: 'Shareable printed copies for the whole group.', stock: 63, soldOut: false },
  { id: 'multi-port-charging-hub', name: 'Multi-Port Charging Hub', category: 'Electronics', seasons: [], destinations: [], parties: [], price: 33.0, currency: 'USD', popular: true, tested: true, icon: '🔌', active: true, description: 'Charge up to 6 devices from one outlet.', stock: 25, soldOut: false },

  { id: 'travel-size-toiletry-kit', name: 'Travel-Size Toiletry Kit', category: 'Toiletries', seasons: [], destinations: [], parties: [], price: 15.0, currency: 'USD', popular: true, tested: true, icon: '🧴', active: true, description: 'TSA-friendly bottles, refillable and reusable.', stock: 57, soldOut: false },
  { id: 'versatile-spare-outfit', name: 'Versatile Spare Outfit', category: 'Clothing', seasons: [], destinations: [], parties: [], price: 26.0, currency: 'USD', popular: false, tested: true, icon: '👕', active: true, description: 'One extra outfit that pairs with everything.', stock: 19, soldOut: false },

  { id: 'laundry-detergent-sheets', name: 'Laundry Detergent Sheets', category: 'Toiletries', seasons: [], destinations: [], parties: [], price: 7.0, currency: 'USD', popular: false, tested: true, icon: '🧼', active: true, description: 'Featherlight sheets, no liquid spills.', stock: 66, soldOut: false },
  { id: 'packing-cubes-set-of-3', name: 'Packing Cubes (Set of 3)', category: 'Gear', seasons: [], destinations: [], parties: [], price: 24.0, currency: 'USD', popular: true, tested: true, icon: '🧳', active: true, description: 'Compress and organize by outfit or category.', stock: 34, soldOut: false },
  { id: 'universal-travel-adapter', name: 'Universal Travel Adapter', category: 'Electronics', seasons: [], destinations: [], parties: [], price: 21.0, currency: 'USD', popular: true, tested: true, icon: '🔋', active: true, description: 'Works in 150+ countries, built-in USB ports.', stock: 41, soldOut: false },

  { id: 'reusable-laundry-bag', name: 'Reusable Laundry Bag', category: 'Comfort', seasons: [], destinations: [], parties: [], price: 8.5, currency: 'USD', popular: false, tested: true, icon: '🧺', active: true, description: 'Mesh bag for longer stays between washes.', stock: 32, soldOut: false },
  { id: 'extended-medication-organizer', name: 'Extended Medication Organizer', category: 'Health', seasons: [], destinations: [], parties: [], price: 12.5, currency: 'USD', popular: false, tested: true, icon: '💊', active: true, description: 'A full month of daily compartments.', stock: 9, soldOut: false },
  { id: 'packing-cubes-full-set', name: 'Packing Cubes (Full Set)', category: 'Gear', seasons: [], destinations: [], parties: [], price: 34.0, currency: 'USD', popular: false, tested: true, icon: '🧳', active: true, description: 'Complete system for extended travel.', stock: 0, soldOut: true },
  { id: 'foldable-spare-duffel', name: 'Foldable Spare Duffel', category: 'Gear', seasons: [], destinations: [], parties: [], price: 19.0, currency: 'USD', popular: true, tested: true, icon: '🎒', active: true, description: 'Packs flat, unfolds for souvenirs on the way home.', stock: 20, soldOut: false },

  // Added for the "Beach Starter Pack" popular kit — distinct form factors from the closest
  // existing items (stick vs. 50ml liquid sunscreen; no water bottle previously in the catalog).
  { id: 'reef-safe-stick-sunscreen', name: 'Reef-Safe Stick Sunscreen SPF30+', category: 'Toiletries', seasons: ['Summer'], destinations: ['Beach'], parties: [], price: 9.0, currency: 'USD', popular: false, tested: true, icon: '🧴', active: true, description: 'Solid, mess-free sunscreen stick — easy to reapply on the go.', stock: 40, soldOut: false },
  { id: 'collapsible-silicone-water-bottle', name: 'Collapsible Silicone Water Bottle', category: 'Comfort', seasons: [], destinations: [], parties: [], price: 15.0, currency: 'USD', popular: false, tested: true, icon: '🥤', active: true, description: 'Squashes flat when empty, holds 500ml when full.', stock: 35, soldOut: false },

  // Added for the "Airport Carry-On" popular kit — nothing in the catalog covered flight-specific
  // comfort/circulation items.
  { id: 'compression-socks-flight', name: 'Compression Socks (Flight)', category: 'Clothing', seasons: [], destinations: [], parties: [], price: 14.0, currency: 'USD', popular: false, tested: true, icon: '🧦', active: true, description: 'Graduated compression to reduce leg fatigue and swelling on long flights.', stock: 45, soldOut: false },
  { id: 'travel-pillow-eye-mask-set', name: 'Travel Pillow & Eye Mask Set', category: 'Comfort', seasons: [], destinations: [], parties: [], price: 22.0, currency: 'USD', popular: false, tested: true, icon: '😴', active: true, description: 'Memory-foam neck pillow paired with a contoured eye mask for real airport sleep.', stock: 30, soldOut: false },
];

const DESTINATION_TINT: Partial<Record<ProductDestination, string>> = {
  Beach: 'var(--tint-yellow)',
  Mountain: 'var(--tint-green)',
  City: 'var(--tint-blue)',
};

const SEASON_TINT: Partial<Record<ProductSeason, string>> = {
  Summer: 'var(--tint-marigold)',
  Winter: 'var(--tint-lavender)',
  Rainy: 'var(--tint-green)',
};

// Shared with ProductDetailComponent so the shop grid and the product page agree on tinting.
// Keys off the first tag in each array (if any) — every seed product carries at most one
// destination/season today, so this preserves the exact prior visual result.
export function getProductTint(product: Product): string {
  if (product.popular) return 'var(--tint-violet)';
  const destination = product.destinations[0];
  const season = product.seasons[0];
  return (
    (destination && DESTINATION_TINT[destination]) ??
    (season && SEASON_TINT[season]) ??
    'var(--tint-cream)'
  );
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

// Same category first, then same destination/season, excluding the product itself. An empty
// destinations/seasons array means "unrestricted" (matches nothing specific), so only a non-empty
// overlap counts as a shared trip trait.
export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const others = PRODUCTS.filter((p) => p.id !== product.id);

  const sameCategory = others.filter((p) => p.category === product.category);
  const sameTrip = others.filter(
    (p) =>
      p.category !== product.category &&
      ((product.destinations.length > 0 && p.destinations.some((d) => product.destinations.includes(d))) ||
        (product.seasons.length > 0 && p.seasons.some((s) => product.seasons.includes(s)))),
  );

  return [...sameCategory, ...sameTrip].slice(0, limit);
}

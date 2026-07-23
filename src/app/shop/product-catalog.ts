// Originally copied verbatim from travel-shop-page.html's mockup <script> ("use mockup data for
// now"), then reshaped to match the real backend's Product model field-for-field (description,
// seasons/destinations/parties as arrays, currency, tested, image, active) while staying mock-data/
// localStorage-only — see the model-alignment plan for the full rationale.
export type ProductSeason = 'Summer' | 'Winter' | 'Rainy';
export type ProductDestination = 'Beach' | 'Mountain' | 'City';
export type ProductParty = 'Solo' | 'Group';

// A generic/template product — the stable concept a packing-list slot points at (e.g. "Passport
// Wallet"). Purely presentational + taxonomy: name, category, description, tags. Purchase data
// (price/currency/image/stock/soldOut) lives on its ProductItem children instead — every product
// has at least one default item (see PRODUCT_ITEMS below), and a product with real brand variants
// just has more than one.
export interface Product {
  id: string; // mock mode: a slug. Real-backend mode: the backend's own Mongo id.
  slug?: string; // real-backend mode only — PopularKit.productIds/Product.linkedProductIds
  // reference products by slug, not the Mongo id above; see ProductCatalogService.getById().
  name: string;
  category: string;
  description: string;
  seasons: ProductSeason[]; // [] = unrestricted/all seasons
  destinations: ProductDestination[]; // [] = unrestricted/all destinations
  parties: ProductParty[]; // [] = unrestricted/all party sizes
  popular: boolean;
  tested: boolean;
  icon: string; // fallback display icon when a specific ProductItem doesn't set its own
  active: boolean; // publish/visibility — independent of a ProductItem's own stock/soldOut
  linkedProductIds?: string[]; // admin-curated explicit "suggested with" links — take priority
  // over ProductCatalogService.getRelated()'s automatic category/trip matching in My Kit's
  // suggestions panel. Undefined/omitted on most seed products = no manual overrides, same as [].
}

// A purchasable SKU under a generic Product — brand (optional; blank = the product's sole/default
// variant), price, currency, image, and inventory. Shop/Cart/Checkout/My-Kit-suggestions all key
// off this, not Product, for anything money- or stock-related.
export interface ProductItem {
  id: string;
  productId: string;
  brand?: string;
  // This item's own display name (e.g. "Samsonite Passport Wallet") — required, matching the
  // backend schema; the admin form defaults it to the parent product's name unless overridden.
  name: string;
  price: number;
  currency: string;
  image?: string;
  icon?: string;
  stock: number;
  soldOut: boolean;
  active: boolean;
}

export const PRODUCTS: Product[] = [
  { id: 'passport-wallet', name: 'Passport Wallet', category: 'Documents', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '📘', active: true, description: 'Slim RFID-blocking travel document wallet.' },
  { id: 'fast-charge-cable-set', name: 'Fast-Charge Cable Set', category: 'Electronics', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🔌', active: true, description: 'Durable braided cables, phone + tablet compatible.' },
  { id: 'travel-medication-case', name: 'Travel Medication Case', category: 'Health', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '💊', active: true, description: 'Labeled daily compartments for on-the-go meds.' },
  { id: 'compact-first-aid-kit', name: 'Compact First-Aid Kit', category: 'Health', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🩹', active: true, description: 'Bandages, antiseptic, and essentials in one pouch.' },
  { id: 'document-organizer-wallet', name: 'Document Organizer Wallet', category: 'Documents', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '📄', active: true, description: 'Keeps tickets, ID, and cards in one place.' },

  { id: 'ripple-swimsuit', name: 'Ripple Swimsuit', category: 'Clothing', seasons: ['Summer'], destinations: ['Beach'], parties: [], popular: true, tested: true, icon: '🩱', active: true, description: 'Quick-dry, chlorine-resistant everyday swimsuit.' },
  { id: 'quick-dry-mini-towel', name: 'Quick-Dry Mini Towel', category: 'Comfort', seasons: ['Summer'], destinations: ['Beach'], parties: [], popular: true, tested: true, icon: '🏖️', active: true, description: "Packs small, dries fast, sand won't stick." },
  { id: 'woven-flip-flops', name: 'Woven Flip-Flops', category: 'Clothing', seasons: ['Summer'], destinations: ['Beach'], parties: [], popular: false, tested: true, icon: '🩴', active: true, description: 'Lightweight sandals for sand and boardwalk.' },
  { id: 'waterproof-phone-pouch', name: 'Waterproof Phone Pouch', category: 'Electronics', seasons: ['Summer'], destinations: ['Beach'], parties: [], popular: false, tested: true, icon: '📱', active: true, description: 'Keeps your phone dry and usable in the water.' },
  { id: 'after-sun-aloe-gel', name: 'After-Sun Aloe Gel', category: 'Toiletries', seasons: ['Summer'], destinations: ['Beach'], parties: [], popular: false, tested: true, icon: '🌿', active: true, description: 'Cooling relief for sun-warmed skin.' },

  { id: 'trailhead-hiking-boots', name: 'Trailhead Hiking Boots', category: 'Clothing', seasons: [], destinations: ['Mountain'], parties: [], popular: true, tested: true, icon: '🥾', active: true, description: 'Ankle support and grip for uneven terrain.' },
  { id: 'carbon-trekking-poles', name: 'Carbon Trekking Poles', category: 'Gear', seasons: [], destinations: ['Mountain'], parties: [], popular: false, tested: true, icon: '🥢', active: true, description: 'Collapsible poles for steep or long trails.' },
  { id: 'ridgeline-daypack-18l', name: 'Ridgeline Daypack 18L', category: 'Gear', seasons: [], destinations: ['Mountain'], parties: [], popular: true, tested: true, icon: '🎒', active: true, description: 'Just enough room for a day on the trail.' },
  { id: 'insect-repellent-spray', name: 'Insect Repellent Spray', category: 'Toiletries', seasons: [], destinations: ['Mountain'], parties: [], popular: false, tested: true, icon: '🦟', active: true, description: 'DEET-free formula, travel-size.' },
  { id: 'rechargeable-headlamp', name: 'Rechargeable Headlamp', category: 'Electronics', seasons: [], destinations: ['Mountain'], parties: [], popular: false, tested: true, icon: '🔦', active: true, description: 'Hands-free light for early starts or camp.' },

  { id: 'everyday-walking-sneakers', name: 'Everyday Walking Sneakers', category: 'Clothing', seasons: [], destinations: ['City'], parties: [], popular: true, tested: true, icon: '👟', active: true, description: 'All-day comfort for cobblestones and subways.' },
  { id: 'crossbody-city-bag', name: 'Crossbody City Bag', category: 'Gear', seasons: [], destinations: ['City'], parties: [], popular: true, tested: true, icon: '👜', active: true, description: 'Anti-theft zip, fits phone, wallet, and a map.' },
  { id: 'slim-power-bank-10000mah', name: 'Slim Power Bank 10000mAh', category: 'Electronics', seasons: [], destinations: ['City'], parties: [], popular: true, tested: true, icon: '🔋', active: true, description: 'A full charge for a long day of exploring.' },
  { id: 'offline-city-map-pack', name: 'Offline City Map Pack', category: 'Electronics', seasons: [], destinations: ['City'], parties: [], popular: false, tested: true, icon: '🗺️', active: true, description: 'Pre-downloaded maps, no data needed.' },
  { id: 'foldable-laundry-bag', name: 'Foldable Laundry Bag', category: 'Comfort', seasons: [], destinations: ['City'], parties: [], popular: false, tested: true, icon: '🧺', active: true, description: 'Keeps worn clothes separate, packs flat.' },

  { id: '50ml-sunscreen-spf50', name: '50ml Sunscreen SPF50', category: 'Toiletries', seasons: ['Summer'], destinations: [], parties: [], popular: true, tested: true, icon: '🧴', active: true, description: 'Travel-size, reef-safe, broad spectrum.' },
  { id: 'polarized-sunglasses', name: 'Polarized Sunglasses', category: 'Accessories', seasons: ['Summer'], destinations: [], parties: [], popular: true, tested: true, icon: '🕶️', active: true, description: 'UV protection with a lightweight frame.' },
  { id: 'packable-wide-brim-hat', name: 'Packable Wide-Brim Hat', category: 'Accessories', seasons: ['Summer'], destinations: [], parties: [], popular: false, tested: true, icon: '👒', active: true, description: 'Folds flat, springs back into shape.' },
  { id: 'breathable-linen-set', name: 'Breathable Linen Set', category: 'Clothing', seasons: ['Summer'], destinations: [], parties: [], popular: false, tested: true, icon: '👕', active: true, description: 'Lightweight layers for hot, humid days.' },
  { id: 'cooling-neck-towel', name: 'Cooling Neck Towel', category: 'Comfort', seasons: ['Summer'], destinations: [], parties: [], popular: false, tested: true, icon: '🧣', active: true, description: 'Activates with water, stays cool for hours.' },

  { id: 'thermal-base-layer-set', name: 'Thermal Base Layer Set', category: 'Clothing', seasons: ['Winter'], destinations: [], parties: [], popular: true, tested: true, icon: '🥼', active: true, description: 'Moisture-wicking layer for cold climates.' },
  { id: 'insulated-touch-gloves', name: 'Insulated Touch Gloves', category: 'Accessories', seasons: ['Winter'], destinations: [], parties: [], popular: false, tested: true, icon: '🧤', active: true, description: 'Stay warm without taking them off for your phone.' },
  { id: 'ribbed-wool-beanie', name: 'Ribbed Wool Beanie', category: 'Accessories', seasons: ['Winter'], destinations: [], parties: [], popular: false, tested: true, icon: '🧢', active: true, description: 'Soft merino wool, packs into a pocket.' },
  { id: 'lip-skin-balm-duo', name: 'Lip & Skin Balm Duo', category: 'Toiletries', seasons: ['Winter'], destinations: [], parties: [], popular: false, tested: true, icon: '💄', active: true, description: 'Protects against wind and dry cabin air.' },
  { id: 'merino-wool-socks-2pk', name: 'Merino Wool Socks (2pk)', category: 'Clothing', seasons: ['Winter'], destinations: [], parties: [], popular: true, tested: true, icon: '🧦', active: true, description: 'Warm, odor-resistant, all-day comfort.' },

  { id: 'packable-rain-jacket', name: 'Packable Rain Jacket', category: 'Clothing', seasons: ['Rainy'], destinations: [], parties: [], popular: true, tested: true, icon: '🧥', active: true, description: 'Waterproof shell that folds into its own pocket.' },
  { id: 'compact-travel-umbrella', name: 'Compact Travel Umbrella', category: 'Gear', seasons: ['Rainy'], destinations: [], parties: [], popular: true, tested: true, icon: '☂️', active: true, description: 'Windproof frame, fits in a daypack pocket.' },
  { id: 'waterproof-shoe-covers', name: 'Waterproof Shoe Covers', category: 'Gear', seasons: ['Rainy'], destinations: [], parties: [], popular: false, tested: true, icon: '👢', active: true, description: 'Slip over any shoe to keep feet dry.' },
  { id: 'electronics-dry-bag', name: 'Electronics Dry Bag', category: 'Electronics', seasons: ['Rainy'], destinations: [], parties: [], popular: false, tested: true, icon: '💧', active: true, description: 'Roll-top seal keeps devices safe from rain.' },
  { id: 'quick-dry-travel-set', name: 'Quick-Dry Travel Set', category: 'Clothing', seasons: ['Rainy'], destinations: [], parties: [], popular: false, tested: true, icon: '👚', active: true, description: 'Dries overnight even in humid conditions.' },

  { id: 'personal-safety-whistle', name: 'Personal Safety Whistle', category: 'Gear', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🔔', active: true, description: 'Lightweight, loud, and easy to clip on.' },
  { id: 'portable-door-alarm', name: 'Portable Door Alarm', category: 'Gear', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🚪', active: true, description: 'Extra peace of mind for solo stays.' },
  { id: 'travel-esim-card', name: 'Travel eSIM Card', category: 'Electronics', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '📶', active: true, description: 'Stay connected the moment you land.' },

  { id: 'group-first-aid-kit-large', name: 'Group First-Aid Kit (Large)', category: 'Health', seasons: [], destinations: [], parties: ['Group'], popular: false, tested: true, icon: '🧰', active: true, description: 'Sized for 4-6 travelers, restockable.' },
  { id: 'printed-itinerary-set', name: 'Printed Itinerary Set', category: 'Documents', seasons: [], destinations: [], parties: ['Group'], popular: false, tested: true, icon: '🗒️', active: true, description: 'Shareable printed copies for the whole group.' },
  { id: 'multi-port-charging-hub', name: 'Multi-Port Charging Hub', category: 'Electronics', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🔌', active: true, description: 'Charge up to 6 devices from one outlet.' },

  { id: 'travel-size-toiletry-kit', name: 'Travel-Size Toiletry Kit', category: 'Toiletries', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🧴', active: true, description: 'TSA-friendly bottles, refillable and reusable.' },
  { id: 'versatile-spare-outfit', name: 'Versatile Spare Outfit', category: 'Clothing', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '👕', active: true, description: 'One extra outfit that pairs with everything.' },

  { id: 'laundry-detergent-sheets', name: 'Laundry Detergent Sheets', category: 'Toiletries', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🧼', active: true, description: 'Featherlight sheets, no liquid spills.' },
  { id: 'packing-cubes-set-of-3', name: 'Packing Cubes (Set of 3)', category: 'Gear', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🧳', active: true, description: 'Compress and organize by outfit or category.' },
  { id: 'universal-travel-adapter', name: 'Universal Travel Adapter', category: 'Electronics', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🔋', active: true, description: 'Works in 150+ countries, built-in USB ports.' },

  { id: 'reusable-laundry-bag', name: 'Reusable Laundry Bag', category: 'Comfort', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🧺', active: true, description: 'Mesh bag for longer stays between washes.' },
  { id: 'extended-medication-organizer', name: 'Extended Medication Organizer', category: 'Health', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '💊', active: true, description: 'A full month of daily compartments.' },
  { id: 'packing-cubes-full-set', name: 'Packing Cubes (Full Set)', category: 'Gear', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🧳', active: true, description: 'Complete system for extended travel.' },
  { id: 'foldable-spare-duffel', name: 'Foldable Spare Duffel', category: 'Gear', seasons: [], destinations: [], parties: [], popular: true, tested: true, icon: '🎒', active: true, description: 'Packs flat, unfolds for souvenirs on the way home.' },

  // Added for the "Beach Starter Pack" popular kit — distinct form factors from the closest
  // existing items (stick vs. 50ml liquid sunscreen; no water bottle previously in the catalog).
  { id: 'reef-safe-stick-sunscreen', name: 'Reef-Safe Stick Sunscreen SPF30+', category: 'Toiletries', seasons: ['Summer'], destinations: ['Beach'], parties: [], popular: false, tested: true, icon: '🧴', active: true, description: 'Solid, mess-free sunscreen stick — easy to reapply on the go.' },
  { id: 'collapsible-silicone-water-bottle', name: 'Collapsible Silicone Water Bottle', category: 'Comfort', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🥤', active: true, description: 'Squashes flat when empty, holds 500ml when full.' },

  // Added for the "Airport Carry-On" popular kit — nothing in the catalog covered flight-specific
  // comfort/circulation items.
  { id: 'compression-socks-flight', name: 'Compression Socks (Flight)', category: 'Clothing', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '🧦', active: true, description: 'Graduated compression to reduce leg fatigue and swelling on long flights.' },
  { id: 'travel-pillow-eye-mask-set', name: 'Travel Pillow & Eye Mask Set', category: 'Comfort', seasons: [], destinations: [], parties: [], popular: false, tested: true, icon: '😴', active: true, description: 'Memory-foam neck pillow paired with a contoured eye mask for real airport sleep.' },
];

// One default (brand: undefined) ProductItem per product, id'd as a plain sequential number (like
// ProductItemService.createItem() assigns for new ones) — mirrors the real backend's one-time
// backfill (src/seed/backfill-product-items.ts) so mock mode's starting data shape matches
// exactly. Admins can add real brand variants on top via /admin/products/:id (each with its own
// price/stock/image/brand).
export const PRODUCT_ITEMS: ProductItem[] = [
  { id: '1', productId: 'passport-wallet', name: 'Passport Wallet', price: 18.0, currency: 'USD', icon: '📘', stock: 42, soldOut: false, active: true },
  { id: '2', productId: 'fast-charge-cable-set', name: 'Fast-Charge Cable Set', price: 14.5, currency: 'USD', icon: '🔌', stock: 58, soldOut: false, active: true },
  { id: '3', productId: 'travel-medication-case', name: 'Travel Medication Case', price: 9.99, currency: 'USD', icon: '💊', stock: 33, soldOut: false, active: true },
  { id: '4', productId: 'compact-first-aid-kit', name: 'Compact First-Aid Kit', price: 16.0, currency: 'USD', icon: '🩹', stock: 47, soldOut: false, active: true },
  { id: '5', productId: 'document-organizer-wallet', name: 'Document Organizer Wallet', price: 22.0, currency: 'USD', icon: '📄', stock: 19, soldOut: false, active: true },

  { id: '6', productId: 'ripple-swimsuit', name: 'Ripple Swimsuit', price: 34.0, currency: 'USD', icon: '🩱', stock: 24, soldOut: false, active: true },
  { id: '7', productId: 'quick-dry-mini-towel', name: 'Quick-Dry Mini Towel', price: 12.0, currency: 'USD', icon: '🏖️', stock: 61, soldOut: false, active: true },
  { id: '8', productId: 'woven-flip-flops', name: 'Woven Flip-Flops', price: 19.5, currency: 'USD', icon: '🩴', stock: 38, soldOut: false, active: true },
  { id: '9', productId: 'waterproof-phone-pouch', name: 'Waterproof Phone Pouch', price: 8.5, currency: 'USD', icon: '📱', stock: 52, soldOut: false, active: true },
  { id: '10', productId: 'after-sun-aloe-gel', name: 'After-Sun Aloe Gel', price: 11.0, currency: 'USD', icon: '🌿', stock: 27, soldOut: false, active: true },

  { id: '11', productId: 'trailhead-hiking-boots', name: 'Trailhead Hiking Boots', price: 89.0, currency: 'USD', icon: '🥾', stock: 14, soldOut: false, active: true },
  { id: '12', productId: 'carbon-trekking-poles', name: 'Carbon Trekking Poles', price: 42.0, currency: 'USD', icon: '🥢', stock: 21, soldOut: false, active: true },
  { id: '13', productId: 'ridgeline-daypack-18l', name: 'Ridgeline Daypack 18L', price: 38.0, currency: 'USD', icon: '🎒', stock: 29, soldOut: false, active: true },
  { id: '14', productId: 'insect-repellent-spray', name: 'Insect Repellent Spray', price: 7.5, currency: 'USD', icon: '🦟', stock: 64, soldOut: false, active: true },
  { id: '15', productId: 'rechargeable-headlamp', name: 'Rechargeable Headlamp', price: 24.0, currency: 'USD', icon: '🔦', stock: 18, soldOut: false, active: true },

  { id: '16', productId: 'everyday-walking-sneakers', name: 'Everyday Walking Sneakers', price: 64.0, currency: 'USD', icon: '👟', stock: 16, soldOut: false, active: true },
  { id: '17', productId: 'crossbody-city-bag', name: 'Crossbody City Bag', price: 36.0, currency: 'USD', icon: '👜', stock: 23, soldOut: false, active: true },
  { id: '18', productId: 'slim-power-bank-10000mah', name: 'Slim Power Bank 10000mAh', price: 27.0, currency: 'USD', icon: '🔋', stock: 40, soldOut: false, active: true },
  { id: '19', productId: 'offline-city-map-pack', name: 'Offline City Map Pack', price: 4.99, currency: 'USD', icon: '🗺️', stock: 99, soldOut: false, active: true },
  { id: '20', productId: 'foldable-laundry-bag', name: 'Foldable Laundry Bag', price: 9.0, currency: 'USD', icon: '🧺', stock: 31, soldOut: false, active: true },

  { id: '21', productId: '50ml-sunscreen-spf50', name: '50ml Sunscreen SPF50', price: 9.5, currency: 'USD', icon: '🧴', stock: 55, soldOut: false, active: true },
  { id: '22', productId: 'polarized-sunglasses', name: 'Polarized Sunglasses', price: 29.0, currency: 'USD', icon: '🕶️', stock: 26, soldOut: false, active: true },
  { id: '23', productId: 'packable-wide-brim-hat', name: 'Packable Wide-Brim Hat', price: 21.0, currency: 'USD', icon: '👒', stock: 20, soldOut: false, active: true },
  { id: '24', productId: 'breathable-linen-set', name: 'Breathable Linen Set', price: 45.0, currency: 'USD', icon: '👕', stock: 12, soldOut: false, active: true },
  { id: '25', productId: 'cooling-neck-towel', name: 'Cooling Neck Towel', price: 10.5, currency: 'USD', icon: '🧣', stock: 44, soldOut: false, active: true },

  { id: '26', productId: 'thermal-base-layer-set', name: 'Thermal Base Layer Set', price: 39.0, currency: 'USD', icon: '🥼', stock: 17, soldOut: false, active: true },
  { id: '27', productId: 'insulated-touch-gloves', name: 'Insulated Touch Gloves', price: 18.0, currency: 'USD', icon: '🧤', stock: 30, soldOut: false, active: true },
  { id: '28', productId: 'ribbed-wool-beanie', name: 'Ribbed Wool Beanie', price: 15.0, currency: 'USD', icon: '🧢', stock: 35, soldOut: false, active: true },
  { id: '29', productId: 'lip-skin-balm-duo', name: 'Lip & Skin Balm Duo', price: 8.0, currency: 'USD', icon: '💄', stock: 48, soldOut: false, active: true },
  { id: '30', productId: 'merino-wool-socks-2pk', name: 'Merino Wool Socks (2pk)', price: 16.5, currency: 'USD', icon: '🧦', stock: 53, soldOut: false, active: true },

  { id: '31', productId: 'packable-rain-jacket', name: 'Packable Rain Jacket', price: 48.0, currency: 'USD', icon: '🧥', stock: 13, soldOut: false, active: true },
  { id: '32', productId: 'compact-travel-umbrella', name: 'Compact Travel Umbrella', price: 14.0, currency: 'USD', icon: '☂️', stock: 45, soldOut: false, active: true },
  { id: '33', productId: 'waterproof-shoe-covers', name: 'Waterproof Shoe Covers', price: 11.0, currency: 'USD', icon: '👢', stock: 28, soldOut: false, active: true },
  { id: '34', productId: 'electronics-dry-bag', name: 'Electronics Dry Bag', price: 13.5, currency: 'USD', icon: '💧', stock: 36, soldOut: false, active: true },
  { id: '35', productId: 'quick-dry-travel-set', name: 'Quick-Dry Travel Set', price: 32.0, currency: 'USD', icon: '👚', stock: 15, soldOut: false, active: true },

  { id: '36', productId: 'personal-safety-whistle', name: 'Personal Safety Whistle', price: 6.0, currency: 'USD', icon: '🔔', stock: 70, soldOut: false, active: true },
  { id: '37', productId: 'portable-door-alarm', name: 'Portable Door Alarm', price: 17.0, currency: 'USD', icon: '🚪', stock: 22, soldOut: false, active: true },
  { id: '38', productId: 'travel-esim-card', name: 'Travel eSIM Card', price: 19.99, currency: 'USD', icon: '📶', stock: 999, soldOut: false, active: true },

  { id: '39', productId: 'group-first-aid-kit-large', name: 'Group First-Aid Kit (Large)', price: 28.0, currency: 'USD', icon: '🧰', stock: 11, soldOut: false, active: true },
  { id: '40', productId: 'printed-itinerary-set', name: 'Printed Itinerary Set', price: 5.0, currency: 'USD', icon: '🗒️', stock: 63, soldOut: false, active: true },
  { id: '41', productId: 'multi-port-charging-hub', name: 'Multi-Port Charging Hub', price: 33.0, currency: 'USD', icon: '🔌', stock: 25, soldOut: false, active: true },

  { id: '42', productId: 'travel-size-toiletry-kit', name: 'Travel-Size Toiletry Kit', price: 15.0, currency: 'USD', icon: '🧴', stock: 57, soldOut: false, active: true },
  { id: '43', productId: 'versatile-spare-outfit', name: 'Versatile Spare Outfit', price: 26.0, currency: 'USD', icon: '👕', stock: 19, soldOut: false, active: true },

  { id: '44', productId: 'laundry-detergent-sheets', name: 'Laundry Detergent Sheets', price: 7.0, currency: 'USD', icon: '🧼', stock: 66, soldOut: false, active: true },
  { id: '45', productId: 'packing-cubes-set-of-3', name: 'Packing Cubes (Set of 3)', price: 24.0, currency: 'USD', icon: '🧳', stock: 34, soldOut: false, active: true },
  { id: '46', productId: 'universal-travel-adapter', name: 'Universal Travel Adapter', price: 21.0, currency: 'USD', icon: '🔋', stock: 41, soldOut: false, active: true },

  { id: '47', productId: 'reusable-laundry-bag', name: 'Reusable Laundry Bag', price: 8.5, currency: 'USD', icon: '🧺', stock: 32, soldOut: false, active: true },
  { id: '48', productId: 'extended-medication-organizer', name: 'Extended Medication Organizer', price: 12.5, currency: 'USD', icon: '💊', stock: 9, soldOut: false, active: true },
  { id: '49', productId: 'packing-cubes-full-set', name: 'Packing Cubes (Full Set)', price: 34.0, currency: 'USD', icon: '🧳', stock: 0, soldOut: true, active: true },
  { id: '50', productId: 'foldable-spare-duffel', name: 'Foldable Spare Duffel', price: 19.0, currency: 'USD', icon: '🎒', stock: 20, soldOut: false, active: true },

  { id: '51', productId: 'reef-safe-stick-sunscreen', name: 'Reef-Safe Stick Sunscreen SPF30+', price: 9.0, currency: 'USD', icon: '🧴', stock: 40, soldOut: false, active: true },
  { id: '52', productId: 'collapsible-silicone-water-bottle', name: 'Collapsible Silicone Water Bottle', price: 15.0, currency: 'USD', icon: '🥤', stock: 35, soldOut: false, active: true },

  { id: '53', productId: 'compression-socks-flight', name: 'Compression Socks (Flight)', price: 14.0, currency: 'USD', icon: '🧦', stock: 45, soldOut: false, active: true },
  { id: '54', productId: 'travel-pillow-eye-mask-set', name: 'Travel Pillow & Eye Mask Set', price: 22.0, currency: 'USD', icon: '😴', stock: 30, soldOut: false, active: true },
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

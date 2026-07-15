// Copied verbatim from travel-shop-page.html's mockup <script> — "use mockup data for now".
export type ProductSeason = 'All' | 'Summer' | 'Winter' | 'Rainy';
export type ProductDestination = 'All' | 'Beach' | 'Mountain' | 'City';

export interface Product {
  name: string;
  category: string;
  season: ProductSeason;
  destination: ProductDestination;
  price: number;
  popular: boolean;
  icon: string;
  desc: string;
}

export const PRODUCTS: Product[] = [
  { name: 'Passport Wallet', category: 'Documents', season: 'All', destination: 'All', price: 18.0, popular: true, icon: '📘', desc: 'Slim RFID-blocking travel document wallet.' },
  { name: 'Fast-Charge Cable Set', category: 'Electronics', season: 'All', destination: 'All', price: 14.5, popular: true, icon: '🔌', desc: 'Durable braided cables, phone + tablet compatible.' },
  { name: 'Travel Medication Case', category: 'Health', season: 'All', destination: 'All', price: 9.99, popular: false, icon: '💊', desc: 'Labeled daily compartments for on-the-go meds.' },
  { name: 'Compact First-Aid Kit', category: 'Health', season: 'All', destination: 'All', price: 16.0, popular: true, icon: '🩹', desc: 'Bandages, antiseptic, and essentials in one pouch.' },
  { name: 'Document Organizer Wallet', category: 'Documents', season: 'All', destination: 'All', price: 22.0, popular: false, icon: '📄', desc: 'Keeps tickets, ID, and cards in one place.' },

  { name: 'Ripple Swimsuit', category: 'Clothing', season: 'Summer', destination: 'Beach', price: 34.0, popular: true, icon: '🩱', desc: 'Quick-dry, chlorine-resistant everyday swimsuit.' },
  { name: 'Quick-Dry Mini Towel', category: 'Comfort', season: 'Summer', destination: 'Beach', price: 12.0, popular: true, icon: '🏖️', desc: "Packs small, dries fast, sand won't stick." },
  { name: 'Woven Flip-Flops', category: 'Clothing', season: 'Summer', destination: 'Beach', price: 19.5, popular: false, icon: '🩴', desc: 'Lightweight sandals for sand and boardwalk.' },
  { name: 'Waterproof Phone Pouch', category: 'Electronics', season: 'Summer', destination: 'Beach', price: 8.5, popular: false, icon: '📱', desc: 'Keeps your phone dry and usable in the water.' },
  { name: 'After-Sun Aloe Gel', category: 'Toiletries', season: 'Summer', destination: 'Beach', price: 11.0, popular: false, icon: '🌿', desc: 'Cooling relief for sun-warmed skin.' },

  { name: 'Trailhead Hiking Boots', category: 'Clothing', season: 'All', destination: 'Mountain', price: 89.0, popular: true, icon: '🥾', desc: 'Ankle support and grip for uneven terrain.' },
  { name: 'Carbon Trekking Poles', category: 'Gear', season: 'All', destination: 'Mountain', price: 42.0, popular: false, icon: '🥢', desc: 'Collapsible poles for steep or long trails.' },
  { name: 'Ridgeline Daypack 18L', category: 'Gear', season: 'All', destination: 'Mountain', price: 38.0, popular: true, icon: '🎒', desc: 'Just enough room for a day on the trail.' },
  { name: 'Insect Repellent Spray', category: 'Toiletries', season: 'All', destination: 'Mountain', price: 7.5, popular: false, icon: '🦟', desc: 'DEET-free formula, travel-size.' },
  { name: 'Rechargeable Headlamp', category: 'Electronics', season: 'All', destination: 'Mountain', price: 24.0, popular: false, icon: '🔦', desc: 'Hands-free light for early starts or camp.' },

  { name: 'Everyday Walking Sneakers', category: 'Clothing', season: 'All', destination: 'City', price: 64.0, popular: true, icon: '👟', desc: 'All-day comfort for cobblestones and subways.' },
  { name: 'Crossbody City Bag', category: 'Gear', season: 'All', destination: 'City', price: 36.0, popular: true, icon: '👜', desc: 'Anti-theft zip, fits phone, wallet, and a map.' },
  { name: 'Slim Power Bank 10000mAh', category: 'Electronics', season: 'All', destination: 'City', price: 27.0, popular: true, icon: '🔋', desc: 'A full charge for a long day of exploring.' },
  { name: 'Offline City Map Pack', category: 'Electronics', season: 'All', destination: 'City', price: 4.99, popular: false, icon: '🗺️', desc: 'Pre-downloaded maps, no data needed.' },
  { name: 'Foldable Laundry Bag', category: 'Comfort', season: 'All', destination: 'City', price: 9.0, popular: false, icon: '🧺', desc: 'Keeps worn clothes separate, packs flat.' },

  { name: '50ml Sunscreen SPF50', category: 'Toiletries', season: 'Summer', destination: 'All', price: 9.5, popular: true, icon: '🧴', desc: 'Travel-size, reef-safe, broad spectrum.' },
  { name: 'Polarized Sunglasses', category: 'Accessories', season: 'Summer', destination: 'All', price: 29.0, popular: true, icon: '🕶️', desc: 'UV protection with a lightweight frame.' },
  { name: 'Packable Wide-Brim Hat', category: 'Accessories', season: 'Summer', destination: 'All', price: 21.0, popular: false, icon: '👒', desc: 'Folds flat, springs back into shape.' },
  { name: 'Breathable Linen Set', category: 'Clothing', season: 'Summer', destination: 'All', price: 45.0, popular: false, icon: '👕', desc: 'Lightweight layers for hot, humid days.' },
  { name: 'Cooling Neck Towel', category: 'Comfort', season: 'Summer', destination: 'All', price: 10.5, popular: false, icon: '🧣', desc: 'Activates with water, stays cool for hours.' },

  { name: 'Thermal Base Layer Set', category: 'Clothing', season: 'Winter', destination: 'All', price: 39.0, popular: true, icon: '🥼', desc: 'Moisture-wicking layer for cold climates.' },
  { name: 'Insulated Touch Gloves', category: 'Accessories', season: 'Winter', destination: 'All', price: 18.0, popular: false, icon: '🧤', desc: 'Stay warm without taking them off for your phone.' },
  { name: 'Ribbed Wool Beanie', category: 'Accessories', season: 'Winter', destination: 'All', price: 15.0, popular: false, icon: '🧢', desc: 'Soft merino wool, packs into a pocket.' },
  { name: 'Lip & Skin Balm Duo', category: 'Toiletries', season: 'Winter', destination: 'All', price: 8.0, popular: false, icon: '💄', desc: 'Protects against wind and dry cabin air.' },
  { name: 'Merino Wool Socks (2pk)', category: 'Clothing', season: 'Winter', destination: 'All', price: 16.5, popular: true, icon: '🧦', desc: 'Warm, odor-resistant, all-day comfort.' },

  { name: 'Packable Rain Jacket', category: 'Clothing', season: 'Rainy', destination: 'All', price: 48.0, popular: true, icon: '🧥', desc: 'Waterproof shell that folds into its own pocket.' },
  { name: 'Compact Travel Umbrella', category: 'Gear', season: 'Rainy', destination: 'All', price: 14.0, popular: true, icon: '☂️', desc: 'Windproof frame, fits in a daypack pocket.' },
  { name: 'Waterproof Shoe Covers', category: 'Gear', season: 'Rainy', destination: 'All', price: 11.0, popular: false, icon: '👢', desc: 'Slip over any shoe to keep feet dry.' },
  { name: 'Electronics Dry Bag', category: 'Electronics', season: 'Rainy', destination: 'All', price: 13.5, popular: false, icon: '💧', desc: 'Roll-top seal keeps devices safe from rain.' },
  { name: 'Quick-Dry Travel Set', category: 'Clothing', season: 'Rainy', destination: 'All', price: 32.0, popular: false, icon: '👚', desc: 'Dries overnight even in humid conditions.' },

  { name: 'Personal Safety Whistle', category: 'Gear', season: 'All', destination: 'All', price: 6.0, popular: false, icon: '🔔', desc: 'Lightweight, loud, and easy to clip on.' },
  { name: 'Portable Door Alarm', category: 'Gear', season: 'All', destination: 'All', price: 17.0, popular: false, icon: '🚪', desc: 'Extra peace of mind for solo stays.' },
  { name: 'Travel eSIM Card', category: 'Electronics', season: 'All', destination: 'All', price: 19.99, popular: true, icon: '📶', desc: 'Stay connected the moment you land.' },

  { name: 'Group First-Aid Kit (Large)', category: 'Health', season: 'All', destination: 'All', price: 28.0, popular: false, icon: '🧰', desc: 'Sized for 4-6 travelers, restockable.' },
  { name: 'Printed Itinerary Set', category: 'Documents', season: 'All', destination: 'All', price: 5.0, popular: false, icon: '🗒️', desc: 'Shareable printed copies for the whole group.' },
  { name: 'Multi-Port Charging Hub', category: 'Electronics', season: 'All', destination: 'All', price: 33.0, popular: true, icon: '🔌', desc: 'Charge up to 6 devices from one outlet.' },

  { name: 'Travel-Size Toiletry Kit', category: 'Toiletries', season: 'All', destination: 'All', price: 15.0, popular: true, icon: '🧴', desc: 'TSA-friendly bottles, refillable and reusable.' },
  { name: 'Versatile Spare Outfit', category: 'Clothing', season: 'All', destination: 'All', price: 26.0, popular: false, icon: '👕', desc: 'One extra outfit that pairs with everything.' },

  { name: 'Laundry Detergent Sheets', category: 'Toiletries', season: 'All', destination: 'All', price: 7.0, popular: false, icon: '🧼', desc: 'Featherlight sheets, no liquid spills.' },
  { name: 'Packing Cubes (Set of 3)', category: 'Gear', season: 'All', destination: 'All', price: 24.0, popular: true, icon: '🧳', desc: 'Compress and organize by outfit or category.' },
  { name: 'Universal Travel Adapter', category: 'Electronics', season: 'All', destination: 'All', price: 21.0, popular: true, icon: '🔋', desc: 'Works in 150+ countries, built-in USB ports.' },

  { name: 'Reusable Laundry Bag', category: 'Comfort', season: 'All', destination: 'All', price: 8.5, popular: false, icon: '🧺', desc: 'Mesh bag for longer stays between washes.' },
  { name: 'Extended Medication Organizer', category: 'Health', season: 'All', destination: 'All', price: 12.5, popular: false, icon: '💊', desc: 'A full month of daily compartments.' },
  { name: 'Packing Cubes (Full Set)', category: 'Gear', season: 'All', destination: 'All', price: 34.0, popular: false, icon: '🧳', desc: 'Complete system for extended travel.' },
  { name: 'Foldable Spare Duffel', category: 'Gear', season: 'All', destination: 'All', price: 19.0, popular: true, icon: '🎒', desc: 'Packs flat, unfolds for souvenirs on the way home.' },
];

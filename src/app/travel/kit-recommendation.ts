// Deterministic kit-building formula, reverse-engineered from Travel_Kit_Scenarios.xlsx
// (54 rows = 3 destinations x 3 seasons x 2 party types x 3 durations). Every kit = 5 fixed
// base items + 5 destination items + 5 season items + 3 party items + 2/3/4 duration items
// (20/21/22 total) — composable from these small tables rather than 54 hardcoded rows.
//
// The 50 possible items here (5+15+15+6+9) map 1:1 onto the 50 products in
// shop/product-catalog.ts — each generic recommendation ("Compact first-aid kit") points at
// the real store product that fulfills it (`compact-first-aid-kit`), verified by hand against
// every catalog entry.
export type Destination = 'Beach' | 'Mountain' | 'City';
export type Season = 'Summer' | 'Winter' | 'Rainy';
export type Party = 'Solo' | 'Group';
export type Duration = 'Quick escape' | 'A proper break' | 'Living it';

export interface TripAnswers {
  destination: Destination;
  season: Season;
  party: Party;
  duration: Duration;
}

export interface KitItem {
  label: string;
  productId: string;
}

const BASE_ITEMS: KitItem[] = [
  { label: 'Passport / government ID', productId: 'passport-wallet' },
  { label: 'Phone + charging cable', productId: 'fast-charge-cable-set' },
  { label: 'Personal medications (labeled)', productId: 'travel-medication-case' },
  { label: 'Compact first-aid kit', productId: 'compact-first-aid-kit' },
  { label: 'Travel document wallet', productId: 'document-organizer-wallet' },
];

const DESTINATION_ITEMS: Record<Destination, KitItem[]> = {
  Beach: [
    { label: 'Swimsuit', productId: 'ripple-swimsuit' },
    { label: 'Quick-dry mini towel', productId: 'quick-dry-mini-towel' },
    { label: 'Flip-flops / sandals', productId: 'woven-flip-flops' },
    { label: 'Waterproof phone pouch', productId: 'waterproof-phone-pouch' },
    { label: 'Aloe vera gel (after-sun)', productId: 'after-sun-aloe-gel' },
  ],
  Mountain: [
    { label: 'Hiking boots', productId: 'trailhead-hiking-boots' },
    { label: 'Trekking poles', productId: 'carbon-trekking-poles' },
    { label: 'Daypack (15-20L)', productId: 'ridgeline-daypack-18l' },
    { label: 'Insect repellent', productId: 'insect-repellent-spray' },
    { label: 'Compact headlamp', productId: 'rechargeable-headlamp' },
  ],
  City: [
    { label: 'Comfortable walking shoes', productId: 'everyday-walking-sneakers' },
    { label: 'Crossbody day bag', productId: 'crossbody-city-bag' },
    { label: 'Portable power bank', productId: 'slim-power-bank-10000mah' },
    { label: 'Offline city map (downloaded)', productId: 'offline-city-map-pack' },
    { label: 'Foldable laundry bag', productId: 'foldable-laundry-bag' },
  ],
};

const SEASON_ITEMS: Record<Season, KitItem[]> = {
  Summer: [
    { label: '50ml sunscreen SPF50', productId: '50ml-sunscreen-spf50' },
    { label: 'Sunglasses', productId: 'polarized-sunglasses' },
    { label: 'Wide-brim hat', productId: 'packable-wide-brim-hat' },
    { label: 'Lightweight breathable clothing', productId: 'breathable-linen-set' },
    { label: 'Cooling neck towel', productId: 'cooling-neck-towel' },
  ],
  Winter: [
    { label: 'Thermal base layers', productId: 'thermal-base-layer-set' },
    { label: 'Insulated gloves', productId: 'insulated-touch-gloves' },
    { label: 'Warm beanie', productId: 'ribbed-wool-beanie' },
    { label: 'Lip balm + moisturizer', productId: 'lip-skin-balm-duo' },
    { label: 'Wool socks (2 pairs)', productId: 'merino-wool-socks-2pk' },
  ],
  Rainy: [
    { label: 'Packable rain jacket', productId: 'packable-rain-jacket' },
    { label: 'Compact umbrella', productId: 'compact-travel-umbrella' },
    { label: 'Waterproof shoe covers', productId: 'waterproof-shoe-covers' },
    { label: 'Dry bag for electronics', productId: 'electronics-dry-bag' },
    { label: 'Quick-dry clothing set', productId: 'quick-dry-travel-set' },
  ],
};

const PARTY_ITEMS: Record<Party, KitItem[]> = {
  Solo: [
    { label: 'Personal safety whistle', productId: 'personal-safety-whistle' },
    { label: 'Portable door lock/alarm', productId: 'portable-door-alarm' },
    { label: 'Local SIM / eSIM', productId: 'travel-esim-card' },
  ],
  Group: [
    { label: 'Shared first-aid kit (larger)', productId: 'group-first-aid-kit-large' },
    { label: 'Printed itinerary copies', productId: 'printed-itinerary-set' },
    { label: 'Multi-device charging hub', productId: 'multi-port-charging-hub' },
  ],
};

const DURATION_ITEMS: Record<Duration, KitItem[]> = {
  'Quick escape': [
    { label: 'Travel-size toiletry kit', productId: 'travel-size-toiletry-kit' },
    { label: '1 spare outfit', productId: 'versatile-spare-outfit' },
  ],
  'A proper break': [
    { label: 'Laundry detergent sheets', productId: 'laundry-detergent-sheets' },
    { label: 'Packing cubes (set of 3)', productId: 'packing-cubes-set-of-3' },
    { label: 'Universal travel adapter', productId: 'universal-travel-adapter' },
  ],
  'Living it': [
    { label: 'Reusable laundry bag', productId: 'reusable-laundry-bag' },
    { label: 'Extra medication supply', productId: 'extended-medication-organizer' },
    { label: 'Packing cubes (full set)', productId: 'packing-cubes-full-set' },
    { label: 'Foldable spare duffel (for souvenirs)', productId: 'foldable-spare-duffel' },
  ],
};

export function buildTravelKit(answers: TripAnswers): KitItem[] {
  return [
    ...BASE_ITEMS,
    ...DESTINATION_ITEMS[answers.destination],
    ...SEASON_ITEMS[answers.season],
    ...PARTY_ITEMS[answers.party],
    ...DURATION_ITEMS[answers.duration],
  ];
}

// Deterministic kit-building formula, reverse-engineered from Travel_Kit_Scenarios.xlsx
// (54 rows = 3 destinations x 3 seasons x 2 party types x 3 durations). Every kit = 5 fixed
// base items + 5 destination items + 5 season items + 3 party items + 2/3/4 duration items
// (20/21/22 total) — composable from these small tables rather than 54 hardcoded rows.
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

const BASE_ITEMS = [
  'Passport / government ID',
  'Phone + charging cable',
  'Personal medications (labeled)',
  'Compact first-aid kit',
  'Travel document wallet',
];

const DESTINATION_ITEMS: Record<Destination, string[]> = {
  Beach: [
    'Swimsuit',
    'Quick-dry mini towel',
    'Flip-flops / sandals',
    'Waterproof phone pouch',
    'Aloe vera gel (after-sun)',
  ],
  Mountain: [
    'Hiking boots',
    'Trekking poles',
    'Daypack (15-20L)',
    'Insect repellent',
    'Compact headlamp',
  ],
  City: [
    'Comfortable walking shoes',
    'Crossbody day bag',
    'Portable power bank',
    'Offline city map (downloaded)',
    'Foldable laundry bag',
  ],
};

const SEASON_ITEMS: Record<Season, string[]> = {
  Summer: [
    '50ml sunscreen SPF50',
    'Sunglasses',
    'Wide-brim hat',
    'Lightweight breathable clothing',
    'Cooling neck towel',
  ],
  Winter: [
    'Thermal base layers',
    'Insulated gloves',
    'Warm beanie',
    'Lip balm + moisturizer',
    'Wool socks (2 pairs)',
  ],
  Rainy: [
    'Packable rain jacket',
    'Compact umbrella',
    'Waterproof shoe covers',
    'Dry bag for electronics',
    'Quick-dry clothing set',
  ],
};

const PARTY_ITEMS: Record<Party, string[]> = {
  Solo: ['Personal safety whistle', 'Portable door lock/alarm', 'Local SIM / eSIM'],
  Group: ['Shared first-aid kit (larger)', 'Printed itinerary copies', 'Multi-device charging hub'],
};

const DURATION_ITEMS: Record<Duration, string[]> = {
  'Quick escape': ['Travel-size toiletry kit', '1 spare outfit'],
  'A proper break': ['Laundry detergent sheets', 'Packing cubes (set of 3)', 'Universal travel adapter'],
  'Living it': [
    'Reusable laundry bag',
    'Extra medication supply',
    'Packing cubes (full set)',
    'Foldable spare duffel (for souvenirs)',
  ],
};

export function buildTravelKit(answers: TripAnswers): string[] {
  return [
    ...BASE_ITEMS,
    ...DESTINATION_ITEMS[answers.destination],
    ...SEASON_ITEMS[answers.season],
    ...PARTY_ITEMS[answers.party],
    ...DURATION_ITEMS[answers.duration],
  ];
}

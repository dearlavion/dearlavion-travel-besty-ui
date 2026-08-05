import { TaxonomyValue } from './taxonomy.service';

/** Mock-mode fallback — the exact same 38 values as the backend's seed/taxonomy-seed.ts, so
 * mock and real mode present identical option lists on first load. Mirrors how product-catalog.ts
 * already duplicates the seeded product catalog for mock mode — same established convention. */
export const TAXONOMY_SEED_DATA: TaxonomyValue[] = [
  { id: 'destination-beach', axis: 'destination', value: 'Beach', order: 0, emoji: '🏖️' },
  { id: 'destination-mountain', axis: 'destination', value: 'Mountain', order: 1, emoji: '⛰️' },
  { id: 'destination-city', axis: 'destination', value: 'City', order: 2, emoji: '🏙️' },

  { id: 'season-summer', axis: 'season', value: 'Summer', order: 0, emoji: '☀️' },
  { id: 'season-winter', axis: 'season', value: 'Winter', order: 1, emoji: '❄️' },
  { id: 'season-rainy', axis: 'season', value: 'Rainy', order: 2, emoji: '🌧️' },

  { id: 'party-solo', axis: 'party', value: 'Solo', order: 0 },
  { id: 'party-group', axis: 'party', value: 'Group', order: 1 },

  { id: 'transportation-flight', axis: 'transportation', value: 'Flight', order: 0 },
  { id: 'transportation-car', axis: 'transportation', value: 'Car', order: 1 },
  { id: 'transportation-train', axis: 'transportation', value: 'Train', order: 2 },
  { id: 'transportation-cruise', axis: 'transportation', value: 'Cruise', order: 3 },

  { id: 'activity-hiking', axis: 'activity', value: 'Hiking', order: 0 },
  { id: 'activity-swimming', axis: 'activity', value: 'Swimming', order: 1 },
  { id: 'activity-sightseeing', axis: 'activity', value: 'Sightseeing', order: 2 },
  { id: 'activity-business', axis: 'activity', value: 'Business', order: 3 },
  { id: 'activity-photography', axis: 'activity', value: 'Photography', order: 4 },
  { id: 'activity-nightlife', axis: 'activity', value: 'Nightlife', order: 5 },
  { id: 'activity-food', axis: 'activity', value: 'Food', order: 6 },
  { id: 'activity-relaxing', axis: 'activity', value: 'Relaxing', order: 7 },

  { id: 'kitCategory-essentials', axis: 'kitCategory', value: 'Essentials', order: 0 },
  { id: 'kitCategory-clothing', axis: 'kitCategory', value: 'Clothing', order: 1 },
  { id: 'kitCategory-footwear', axis: 'kitCategory', value: 'Footwear', order: 2 },
  { id: 'kitCategory-toiletries', axis: 'kitCategory', value: 'Toiletries', order: 3 },
  { id: 'kitCategory-beauty-kit', axis: 'kitCategory', value: 'Beauty Kit', order: 4 },
  { id: 'kitCategory-tech-pack', axis: 'kitCategory', value: 'Tech Pack', order: 5 },
  { id: 'kitCategory-health-safety', axis: 'kitCategory', value: 'Health & Safety', order: 6 },
  { id: 'kitCategory-weather-gear', axis: 'kitCategory', value: 'Weather Gear', order: 7 },
  { id: 'kitCategory-activity-gear', axis: 'kitCategory', value: 'Activity Gear', order: 8 },
  { id: 'kitCategory-comfort', axis: 'kitCategory', value: 'Comfort', order: 9 },
  { id: 'kitCategory-food-hydration', axis: 'kitCategory', value: 'Food & Hydration', order: 10 },

  { id: 'duration-short', axis: 'duration', value: 'Quick escape', order: 0, subtext: '2–4 days', code: 'short' },
  { id: 'duration-medium', axis: 'duration', value: 'A proper break', order: 1, subtext: '1–2 weeks', code: 'medium' },
  { id: 'duration-long', axis: 'duration', value: 'Living it', order: 2, subtext: '3+ weeks', code: 'long' },

  { id: 'gender-woman', axis: 'gender', value: 'Woman', order: 0 },
  { id: 'gender-man', axis: 'gender', value: 'Man', order: 1 },
  { id: 'gender-nonbinary', axis: 'gender', value: 'Nonbinary', order: 2 },
  { id: 'gender-prefer-not-to-say', axis: 'gender', value: 'Prefer not to say', order: 3 },
];

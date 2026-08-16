import { MasterDataValue } from './master-data.service';

/** Mock-mode fallback — the exact same 39 values as dearlavion-spring-master-data-service's
 * ReferenceDataSeed.java, so mock and real mode present identical option lists on first load.
 * Mirrors how product-catalog.ts already duplicates the seeded product catalog for mock mode —
 * same established convention (this file replaces the old taxonomy-seed-data.ts 1:1). */
export const MASTER_DATA_SEED_DATA: MasterDataValue[] = [
  { id: 'destination-beach', type: 'destination', value: 'Beach', order: 0, emoji: '🏖️' },
  { id: 'destination-mountain', type: 'destination', value: 'Mountain', order: 1, emoji: '⛰️' },
  { id: 'destination-city', type: 'destination', value: 'City', order: 2, emoji: '🏙️' },

  { id: 'season-summer', type: 'season', value: 'Summer', order: 0, emoji: '☀️' },
  { id: 'season-winter', type: 'season', value: 'Winter', order: 1, emoji: '❄️' },
  { id: 'season-rainy', type: 'season', value: 'Rainy', order: 2, emoji: '🌧️' },

  { id: 'party-solo', type: 'party', value: 'Solo', order: 0 },
  { id: 'party-group', type: 'party', value: 'Group', order: 1 },

  { id: 'transportation-flight', type: 'transportation', value: 'Flight', order: 0 },
  { id: 'transportation-car', type: 'transportation', value: 'Car', order: 1 },
  { id: 'transportation-train', type: 'transportation', value: 'Train', order: 2 },
  { id: 'transportation-cruise', type: 'transportation', value: 'Cruise', order: 3 },

  { id: 'activity-hiking', type: 'activity', value: 'Hiking', order: 0 },
  { id: 'activity-swimming', type: 'activity', value: 'Swimming', order: 1 },
  { id: 'activity-sightseeing', type: 'activity', value: 'Sightseeing', order: 2 },
  { id: 'activity-business', type: 'activity', value: 'Business', order: 3 },
  { id: 'activity-photography', type: 'activity', value: 'Photography', order: 4 },
  { id: 'activity-nightlife', type: 'activity', value: 'Nightlife', order: 5 },
  { id: 'activity-food', type: 'activity', value: 'Food', order: 6 },
  { id: 'activity-relaxing', type: 'activity', value: 'Relaxing', order: 7 },

  { id: 'kitCategory-essentials', type: 'kitCategory', value: 'Essentials', order: 0 },
  { id: 'kitCategory-toiletries', type: 'kitCategory', value: 'Toiletries', order: 1 },
  { id: 'kitCategory-beauty', type: 'kitCategory', value: 'Beauty', order: 2 },
  { id: 'kitCategory-clothing', type: 'kitCategory', value: 'Clothing', order: 3 },
  { id: 'kitCategory-footwear', type: 'kitCategory', value: 'Footwear', order: 4 },
  { id: 'kitCategory-electronics', type: 'kitCategory', value: 'Electronics', order: 5 },
  { id: 'kitCategory-accessories', type: 'kitCategory', value: 'Accessories', order: 6 },
  { id: 'kitCategory-health-safety', type: 'kitCategory', value: 'Health & Safety', order: 7 },
  { id: 'kitCategory-activity-gear', type: 'kitCategory', value: 'Activity Gear', order: 8 },
  { id: 'kitCategory-travel-documents', type: 'kitCategory', value: 'Travel Documents', order: 9 },

  { id: 'duration-day', type: 'duration', value: 'Day Tour', order: 0, subtext: '1 day', code: 'day' },
  { id: 'duration-short', type: 'duration', value: 'Quick escape', order: 1, subtext: '2–4 days', code: 'short' },
  { id: 'duration-medium', type: 'duration', value: 'A proper break', order: 2, subtext: '1–2 weeks', code: 'medium' },
  { id: 'duration-long', type: 'duration', value: 'Living it', order: 3, subtext: '3+ weeks', code: 'long' },

  { id: 'gender-woman', type: 'gender', value: 'Woman', order: 0 },
  { id: 'gender-man', type: 'gender', value: 'Man', order: 1 },
  { id: 'gender-nonbinary', type: 'gender', value: 'Nonbinary', order: 2 },
  { id: 'gender-prefer-not-to-say', type: 'gender', value: 'Prefer not to say', order: 3 },
];

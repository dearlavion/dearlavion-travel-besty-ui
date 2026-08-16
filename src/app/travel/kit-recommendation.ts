// Mock-mode kit builder. Scores every product in the shared catalog against the trip answers,
// rather than hardcoding a fixed item list per answer (the old approach — reverse-engineered from
// Travel_Kit_Scenarios.xlsx — didn't scale: every new product needed a human to remember to add
// its id into the right lookup table, or it silently never got recommended). Products already
// carry their own applicability tags (seasons/destinations/parties/activities/transportModes/
// kitCategory, see product-catalog.ts) — a new product just needs those tags set once at creation
// and it's automatically eligible everywhere, present and future. This mirrors the shape the real
// backend's own comment implies it already uses ("scores every real catalog product").
import { KitCategory, PRODUCTS, Product, ProductTransportation } from '../shop/product-catalog';

// No longer closed unions — these axes are now admin-editable via MasterDataService/Kit Settings
// (see product-catalog.ts's own widening for the same reason).
export type Destination = string;
export type Season = string;
export type Party = string;
// Stable code ('short'|'medium'|'long'), not the admin-editable display label — mirrors the
// backend's SurveyAnswersDto/kit-engine.ts. TravelComponent resolves the label for display text
// via MasterDataService separately; this is only ever the scoring key.
export type Duration = string;
export type Transportation = ProductTransportation;
export type Gender = string;
export type { KitCategory };

export interface TripAnswers {
  // [] = "All" — unrestricted, same convention as a product's own Product.destinations: [].
  destinations: Destination[];
  season: Season;
  party: Party;
  duration: Duration;
  transportation: Transportation;
  priorityCategories: KitCategory[];
  activities?: string[];
  gender?: Gender; // soft-boosts products tagged for this gender (see scoreProduct)
}

export interface KitItem {
  label: string;
  productId: string;
  productItemId?: string; // the specific sized/variant SKU the engine matched to the trip
}

// Always included regardless of scoring — the handful of items every trip needs.
const BASE_ITEMS: KitItem[] = [
  { label: 'Passport / government ID', productId: 'passport-wallet' },
  { label: 'Phone + charging cable', productId: 'fast-charge-cable-set' },
  { label: 'Personal medications (labeled)', productId: 'travel-medication-case' },
  { label: 'Compact first-aid kit', productId: 'compact-first-aid-kit' },
  { label: 'Travel document wallet', productId: 'document-organizer-wallet' },
];
const BASE_PRODUCT_IDS = new Set(BASE_ITEMS.map((item) => item.productId));

// How many scored (non-base) items to include, by trip length — same 20/21/22-ish totals the old
// static-table formula produced, so switching the selection mechanism doesn't jar the kit size.
// Keyed on Duration's stable code, not its admin-editable display label — see the Duration type.
const DURATION_TARGET: Record<string, number> = {
  short: 15,
  medium: 16,
  long: 17,
};

// Hard filters: a product tagged for specific destinations/seasons that don't match the trip is
// just wrong to pack (a swimsuit for a winter mountain trip), so it's excluded outright rather
// than merely down-scored. An empty tag array means "unrestricted" — always eligible on that axis.
function isEligible(product: Product, answers: TripAnswers): boolean {
  if (!product.active || BASE_PRODUCT_IDS.has(product.id)) return false;
  // Both sides follow the same "[] = unrestricted" convention: a product with no destination tag
  // fits any trip, and an answer of "All" (empty) doesn't exclude any product either way.
  if (
    product.destinations.length &&
    answers.destinations.length &&
    !product.destinations.some((d) => answers.destinations.includes(d))
  ) {
    return false;
  }
  if (product.seasons.length && !product.seasons.includes(answers.season)) return false;
  return true;
}

// Soft boosts: these make a product more likely to be picked among eligible ones, they don't
// exclude it. kitCategory is weighted heaviest — it's the direct "what matters most to you"
// signal, and the only one the user is asked about with the sole purpose of ranking. Multi-select:
// any one matching category earns the full boost (not split across picks) — picking more
// categories widens what gets prioritized, it doesn't dilute each pick's weight.
function scoreProduct(product: Product, answers: TripAnswers): number {
  let score = 0;
  if (product.parties.includes(answers.party)) score += 2;
  if (product.transportModes?.includes(answers.transportation)) score += 2;
  // Soft boosts, mirroring KitEngine's durationBoost/genderBoost — an untagged product suits any
  // trip length and anyone, so tagging can only lift a product, never exclude it. Durations are
  // tagged by Duration's stable code, which is exactly what `answers.duration` carries.
  if (product.durations?.includes(answers.duration)) score += 2;
  if (answers.gender && product.genders?.includes(answers.gender)) score += 2;
  const activities = answers.activities ?? [];
  score += (product.activities ?? []).filter((activity) => activities.includes(activity)).length;
  // Any overlap, scored once — a product tagged with many buckets shouldn't outscore a
  // well-matched one simply by covering more of them (mirrors KitEngine.kitCategoryBoost).
  if (product.kitCategories.some((c) => answers.priorityCategories.includes(c))) score += 5;
  if (product.popular) score += 0.5; // small deterministic tiebreaker
  return score;
}

export function buildTravelKit(answers: TripAnswers): KitItem[] {
  const target = DURATION_TARGET[answers.duration] ?? 16;
  const scored = PRODUCTS.filter((product) => isEligible(product, answers))
    .map((product) => ({ product, score: scoreProduct(product, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, target)
    .map(({ product }): KitItem => ({ label: product.name, productId: product.id }));
  return [...BASE_ITEMS, ...scored];
}

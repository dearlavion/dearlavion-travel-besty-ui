import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Destination, Duration, Party, Season } from '../../travel/kit-recommendation';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'travel-besty-popular-kits';
// Reads go through the public, unauthenticated endpoint (active kits only) — Home/Travel are
// anonymous-accessible pages and shouldn't need a token just to browse. Only writes require the
// admin-guarded endpoint below (which also sees inactive kits, but nothing in this app currently
// re-surfaces that — a soft-deleted kit becomes invisible here too, matching Products' tradeoff).
const PUBLIC_BASE = `${environment.apiUrl}/popular-kits`;
const ADMIN_BASE = `${environment.apiUrl}/admin/popular-kits`;

export interface PopularKit {
  id: string;
  image: string;
  name: string;
  tag: string;
  // Cosmetic trip tags only (shown as badges, feed the "Built for your ... trip" summary text) —
  // they no longer generate the kit's contents. `productIds` is the sole, admin-curated source
  // of what's actually in the kit.
  destination: Destination;
  season: Season;
  party: Party;
  duration: Duration;
  productIds: string[];
  active?: boolean; // backend-only concept (soft delete); undefined/mock kits are always active
}

export type NewPopularKit = Omit<PopularKit, 'id'>;

// Seeded with the 4 kits that used to be hardcoded directly in HomeComponent, so moving the
// "Popular kits" homepage section to this admin-editable service doesn't change what shows up
// until an admin actually edits the collection. `productIds` here is exactly what
// buildTravelKit(...) used to generate for each kit's old destination/season/party/duration
// combo, frozen at migration time so item counts/contents don't shift on this one-time cutover.
const SEED_KITS: PopularKit[] = [
  {
    id: 'beach-essentials',
    image: 'https://picsum.photos/seed/beach-starter-pack/600/420',
    name: 'Beach Starter Pack',
    tag: 'warm climates',
    destination: 'Beach',
    season: 'Summer',
    party: 'Solo',
    duration: 'Quick escape',
    productIds: [
      'reef-safe-stick-sunscreen',
      'quick-dry-mini-towel',
      'waterproof-phone-pouch',
      'packable-wide-brim-hat',
      'collapsible-silicone-water-bottle',
      'woven-flip-flops',
    ],
  },
  {
    id: 'backpacker-kit',
    image: 'https://picsum.photos/seed/backpacker-kit/600/420',
    name: 'Backpacker Kit',
    tag: 'long stays',
    destination: 'Mountain',
    season: 'Summer',
    party: 'Solo',
    duration: 'Living it',
    productIds: [
      'passport-wallet',
      'fast-charge-cable-set',
      'travel-medication-case',
      'compact-first-aid-kit',
      'document-organizer-wallet',
      'trailhead-hiking-boots',
      'carbon-trekking-poles',
      'ridgeline-daypack-18l',
      'insect-repellent-spray',
      'rechargeable-headlamp',
      '50ml-sunscreen-spf50',
      'polarized-sunglasses',
      'packable-wide-brim-hat',
      'breathable-linen-set',
      'cooling-neck-towel',
      'personal-safety-whistle',
      'portable-door-alarm',
      'travel-esim-card',
      'reusable-laundry-bag',
      'extended-medication-organizer',
      'packing-cubes-full-set',
      'foldable-spare-duffel',
    ],
  },
  {
    id: 'winter-city-break',
    image: 'https://picsum.photos/seed/winter-city-break/600/420',
    name: 'Winter City Break',
    tag: 'short stays',
    destination: 'City',
    season: 'Winter',
    party: 'Solo',
    duration: 'Quick escape',
    productIds: [
      'passport-wallet',
      'fast-charge-cable-set',
      'travel-medication-case',
      'compact-first-aid-kit',
      'document-organizer-wallet',
      'everyday-walking-sneakers',
      'crossbody-city-bag',
      'slim-power-bank-10000mah',
      'offline-city-map-pack',
      'foldable-laundry-bag',
      'thermal-base-layer-set',
      'insulated-touch-gloves',
      'ribbed-wool-beanie',
      'lip-skin-balm-duo',
      'merino-wool-socks-2pk',
      'personal-safety-whistle',
      'portable-door-alarm',
      'travel-esim-card',
      'travel-size-toiletry-kit',
      'versatile-spare-outfit',
    ],
  },
  {
    id: 'group-travel-bundle',
    image: 'https://picsum.photos/seed/group-travel-bundle/600/420',
    name: 'Group Travel Bundle',
    tag: '2–6 people',
    destination: 'Beach',
    season: 'Rainy',
    party: 'Group',
    duration: 'A proper break',
    productIds: [
      'passport-wallet',
      'fast-charge-cable-set',
      'travel-medication-case',
      'compact-first-aid-kit',
      'document-organizer-wallet',
      'ripple-swimsuit',
      'quick-dry-mini-towel',
      'woven-flip-flops',
      'waterproof-phone-pouch',
      'after-sun-aloe-gel',
      'packable-rain-jacket',
      'compact-travel-umbrella',
      'waterproof-shoe-covers',
      'electronics-dry-bag',
      'quick-dry-travel-set',
      'group-first-aid-kit-large',
      'printed-itinerary-set',
      'multi-port-charging-hub',
      'laundry-detergent-sheets',
      'packing-cubes-set-of-3',
      'universal-travel-adapter',
    ],
  },
  {
    id: 'day-hike-essentials',
    image: 'https://picsum.photos/seed/day-hike-essentials/600/420',
    name: 'Day Hike Essentials',
    tag: 'day trips',
    destination: 'Mountain',
    season: 'Summer',
    party: 'Solo',
    duration: 'Quick escape',
    productIds: [
      '50ml-sunscreen-spf50',
      'quick-dry-mini-towel',
      'packable-wide-brim-hat',
      'collapsible-silicone-water-bottle',
      'compact-first-aid-kit',
      'packable-rain-jacket',
    ],
  },
  {
    id: 'airport-carry-on',
    image: 'https://picsum.photos/seed/airport-carry-on/600/420',
    name: 'Airport Carry-On',
    tag: 'flight day',
    destination: 'City',
    season: 'Summer',
    party: 'Solo',
    duration: 'Quick escape',
    productIds: [
      'collapsible-silicone-water-bottle',
      'slim-power-bank-10000mah',
      'fast-charge-cable-set',
      'compression-socks-flight',
      'travel-pillow-eye-mask-set',
      'travel-size-toiletry-kit',
      'packable-rain-jacket',
    ],
  },
];

// SSR prerenders / (see app.routes.server.ts) and Node has no localStorage — every read/write
// here must go through this guard or the build breaks.
function loadStoredKits(): PopularKit[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PopularKit[];
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ApiPopularKit {
  id: string;
  slug: string;
  name: string;
  tag?: string;
  image?: string;
  destination?: string;
  season?: string;
  party?: string;
  duration?: string;
  productIds?: string[];
  active?: boolean;
}

// The backend's own Mongo `id` is opaque; `slug` is the stable, admin-facing identifier (and
// what update/delete accept in place of it), so it doubles as our routing id — keeps
// /popular/:id and /admin/popular-kits/:id/edit URLs readable instead of Mongo hashes.
function mapFromApi(raw: ApiPopularKit): PopularKit {
  return {
    id: raw.slug,
    image: raw.image ?? '',
    name: raw.name,
    tag: raw.tag ?? '',
    destination: (raw.destination as Destination) ?? 'Beach',
    season: (raw.season as Season) ?? 'Summer',
    party: (raw.party as Party) ?? 'Solo',
    duration: (raw.duration as Duration) ?? 'Quick escape',
    productIds: raw.productIds ?? [],
    active: raw.active,
  };
}

@Injectable({ providedIn: 'root' })
export class PopularKitsService {
  private readonly http = inject(HttpClient);

  readonly kits = signal<PopularKit[]>(environment.useMockData ? (loadStoredKits() ?? SEED_KITS) : []);

  constructor() {
    if (!environment.useMockData) {
      this.http.get<ApiPopularKit[]>(PUBLIC_BASE).subscribe((res) => this.kits.set(res.map(mapFromApi)));
    }
  }

  getById(id: string): PopularKit | undefined {
    return this.kits().find((k) => k.id === id);
  }

  addKit(input: NewPopularKit): PopularKit {
    if (!environment.useMockData) {
      this.http.post<ApiPopularKit>(ADMIN_BASE, input).subscribe((created) => {
        this.kits.update((list) => [...list, mapFromApi(created)]);
      });
      return { ...input, id: slugify(input.name) };
    }

    const baseSlug = slugify(input.name) || 'kit';
    const existingIds = new Set(this.kits().map((k) => k.id));
    let id = baseSlug;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const kit: PopularKit = { ...input, id };
    this.kits.update((list) => [...list, kit]);
    this.persist();
    return kit;
  }

  updateKit(id: string, patch: Partial<Omit<PopularKit, 'id'>>): void {
    if (!environment.useMockData) {
      this.kits.update((list) => list.map((k) => (k.id === id ? { ...k, ...patch } : k)));
      this.http.patch<ApiPopularKit>(`${ADMIN_BASE}/${id}`, patch).subscribe((updated) => {
        const mapped = mapFromApi(updated);
        this.kits.update((list) => list.map((k) => (k.id === id ? mapped : k)));
      });
      return;
    }

    this.kits.update((list) => list.map((k) => (k.id === id ? { ...k, ...patch } : k)));
    this.persist();
  }

  deleteKit(id: string): void {
    if (!environment.useMockData) {
      this.http.delete(`${ADMIN_BASE}/${id}`).subscribe(() => {
        this.kits.update((list) => list.map((k) => (k.id === id ? { ...k, active: false } : k)));
      });
      return;
    }

    this.kits.update((list) => list.filter((k) => k.id !== id));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.kits()));
  }
}

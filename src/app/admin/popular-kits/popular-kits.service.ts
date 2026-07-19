import { Injectable, signal } from '@angular/core';
import { Destination, Duration, Party, Season } from '../../travel/kit-recommendation';

const STORAGE_KEY = 'travel-besty-popular-kits';

export interface PopularKit {
  id: string;
  image: string;
  name: string;
  tag: string;
  destination: Destination;
  season: Season;
  party: Party;
  duration: Duration;
}

export type NewPopularKit = Omit<PopularKit, 'id'>;

// Seeded with the 4 kits that used to be hardcoded directly in HomeComponent, so moving the
// "Popular kits" homepage section to this admin-editable service doesn't change what shows up
// until an admin actually edits the collection.
const SEED_KITS: PopularKit[] = [
  {
    id: 'beach-essentials',
    image: 'https://picsum.photos/seed/beach-essentials/600/420',
    name: 'Beach Essentials',
    tag: 'warm climates',
    destination: 'Beach',
    season: 'Summer',
    party: 'Solo',
    duration: 'Quick escape',
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

@Injectable({ providedIn: 'root' })
export class PopularKitsService {
  readonly kits = signal<PopularKit[]>(loadStoredKits() ?? SEED_KITS);

  getById(id: string): PopularKit | undefined {
    return this.kits().find((k) => k.id === id);
  }

  addKit(input: NewPopularKit): PopularKit {
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
    this.kits.update((list) => list.map((k) => (k.id === id ? { ...k, ...patch } : k)));
    this.persist();
  }

  deleteKit(id: string): void {
    this.kits.update((list) => list.filter((k) => k.id !== id));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.kits()));
  }
}

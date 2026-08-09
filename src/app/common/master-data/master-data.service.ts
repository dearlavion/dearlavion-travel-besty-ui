import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { slugify } from '../slugify';
import { MASTER_DATA_SEED_DATA } from './master-data-seed-data';

// The 8 option lists that drive the /travel survey and product tagging — see Kit Settings.
export type MasterDataType =
  | 'destination'
  | 'season'
  | 'party'
  | 'transportation'
  | 'activity'
  | 'kitCategory'
  | 'duration'
  | 'gender';

export interface MasterDataCollection {
  key: string;
  label: string;
  /** REST path segment on dearlavion-spring-master-data-service, e.g. GET /destinations. */
  path: string;
}

// Mirrors the 8 reference-data types dearlavion-spring-master-data-service owns (see that repo's
// README) — each is its own Mongo collection/REST resource, not one generic type-keyed collection.
export const MASTER_DATA_COLLECTIONS: MasterDataCollection[] = [
  { key: 'destination', label: 'Destinations', path: 'destinations' },
  { key: 'season', label: 'Seasons', path: 'seasons' },
  { key: 'party', label: 'Parties', path: 'parties' },
  { key: 'transportation', label: 'Transportation', path: 'transportation-modes' },
  { key: 'activity', label: 'Activities', path: 'activities' },
  { key: 'kitCategory', label: 'Kit Categories', path: 'kit-categories' },
  { key: 'duration', label: 'Durations', path: 'durations' },
  { key: 'gender', label: 'Genders', path: 'genders' },
];

function pathFor(type: string): string {
  return MASTER_DATA_COLLECTIONS.find((c) => c.key === type)?.path ?? type;
}

export interface MasterDataValue {
  id: string;
  type: string;
  value: string; // editable display label, e.g. "Beach"
  order: number;
  emoji?: string | null;
  subtext?: string | null;
  // Only set for type:'duration' — stable, non-admin-editable scoring key ('short'|'medium'|'long').
  // Every other type leaves this unset and uses `value` itself as the key.
  code?: string | null;
}

export type NewMasterDataValue = Omit<MasterDataValue, 'id'>;

// The 8 types' out-of-the-box display/step order — mirrors the backend's TypeOrder.DEFAULT_ORDER,
// used both as the fallback before typeOrder has ever loaded and as the default the backend
// itself falls back to until an admin saves a custom order.
export const DEFAULT_TYPE_ORDER: MasterDataType[] = [
  'destination',
  'season',
  'duration',
  'party',
  'transportation',
  'activity',
  'kitCategory',
  'gender',
];

const STORAGE_KEY = 'travel-besty-master-data';
const TYPE_ORDER_STORAGE_KEY = 'travel-besty-master-data-type-order';

// SSR prerenders pages that read master data (e.g. /travel, /shop) and Node has no localStorage —
// every read/write here must go through this guard or the build breaks.
function loadStored(): MasterDataValue[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MasterDataValue[];
  } catch {
    return null;
  }
}

function loadStoredTypeOrder(): string[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TYPE_ORDER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

/**
 * The 8 admin-editable option lists behind the /travel survey and product tagging (see Kit
 * Settings, /admin/kit-settings) — backed by dearlavion-spring-master-data-service, the single
 * canonical source for this data (replaces the old store-engine-v2 taxonomy module + the popular
 * kit form's hardcoded lists, both retired). Consumed by public pages (Travel, Shop, admin product
 * form) as well as the admin CRUD page itself, so this needs full mock-mode support, same as
 * ProductCatalogService/StoreSettingsService. Eager-loads in the constructor (not a lazy
 * ensureLoaded()) since nearly every consumer needs it immediately.
 */
@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly http = inject(HttpClient);

  readonly values = signal<MasterDataValue[]>(environment.useMockData ? (loadStored() ?? MASTER_DATA_SEED_DATA) : []);

  // Admin-configurable order of the 8 types — drives both Kit Settings' section order and the
  // /travel survey's step order, so the two always agree. Falls back to DEFAULT_TYPE_ORDER until
  // an admin has ever saved a custom one.
  readonly typeOrder = signal<string[]>(
    environment.useMockData ? (loadStoredTypeOrder() ?? DEFAULT_TYPE_ORDER) : DEFAULT_TYPE_ORDER,
  );

  constructor() {
    if (!environment.useMockData) {
      // Unlike the old taxonomy module, master-data-service has no combined "all types" endpoint —
      // each type is its own collection/resource. Fetch all 8 in parallel and flatten into one
      // cached signal so every consumer keeps the same eager, always-available forType() shape.
      for (const collection of MASTER_DATA_COLLECTIONS) {
        this.http.get<Omit<MasterDataValue, 'type'>[]>(`${environment.masterDataUrl}/${collection.path}`).subscribe({
          next: (items) => {
            const withType = items.map((i) => ({ ...i, type: collection.key }));
            this.values.update((list) => [...list.filter((v) => v.type !== collection.key), ...withType]);
          },
          error: () => {},
        });
      }
      this.http.get<{ order: string[] }>(`${environment.masterDataUrl}/type-order`).subscribe({
        next: (res) => this.typeOrder.set(res.order),
        error: () => {},
      });
    }
  }

  /** Values for one type, in display order. */
  forType(type: MasterDataType | string): MasterDataValue[] {
    return this.values()
      .filter((v) => v.type === type)
      .sort((a, b) => a.order - b.order);
  }

  /** Admin: add a new option. Duration is fixed-cardinality — callers must not offer this for it. */
  create(input: NewMasterDataValue): MasterDataValue {
    const path = pathFor(input.type);
    if (!environment.useMockData) {
      this.http
        .post<Omit<MasterDataValue, 'type'>>(`${environment.masterDataUrl}/admin/${path}`, {
          value: input.value,
          order: input.order,
          emoji: input.emoji,
          subtext: input.subtext,
        })
        .subscribe({
          next: (created) => this.values.update((list) => [...list, { ...created, type: input.type }]),
          error: () => {},
        });
      // Callers don't use the return value in real mode (fire-and-forget, same as the HTTP path
      // above) — this placeholder just satisfies the synchronous signature mock mode still needs.
      return { ...input, id: `${input.type}-${slugify(input.value)}` };
    }

    const id = `${input.type}-${slugify(input.value)}`;
    const value: MasterDataValue = { ...input, id };
    this.values.update((list) => [...list, value]);
    this.persist();
    return value;
  }

  /** Admin: rename a label, change its order, or edit emoji/subtext. Never touches `code`. Looks
   * up the owning type from the cached row itself, so callers only ever need the id — same
   * ergonomic call shape the old TaxonomyService.update() had. */
  update(id: string, patch: Partial<Pick<MasterDataValue, 'value' | 'order' | 'emoji' | 'subtext'>>): void {
    const type = this.values().find((v) => v.id === id)?.type;
    this.values.update((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    if (!environment.useMockData && type) {
      const path = pathFor(type);
      this.http.put<Omit<MasterDataValue, 'type'>>(`${environment.masterDataUrl}/admin/${path}/${id}`, patch).subscribe({
        next: (updated) => this.values.update((list) => list.map((v) => (v.id === id ? { ...updated, type } : v))),
        error: () => {},
      });
      return;
    }

    this.persist();
  }

  /** Admin: remove an option. Duration is fixed-cardinality — callers must not offer this for it. */
  delete(id: string): void {
    const type = this.values().find((v) => v.id === id)?.type;
    if (!environment.useMockData && type) {
      const path = pathFor(type);
      this.http.delete(`${environment.masterDataUrl}/admin/${path}/${id}`).subscribe({
        next: () => this.values.update((list) => list.filter((v) => v.id !== id)),
        error: () => {},
      });
      return;
    }

    this.values.update((list) => list.filter((v) => v.id !== id));
    this.persist();
  }

  /** Admin: save a new type order (drag-and-drop on Kit Settings). Applied optimistically so the
   * page and /travel both reflect it immediately, same pattern as update()/create()/delete(). */
  updateTypeOrder(order: string[]): void {
    this.typeOrder.set(order);
    if (!environment.useMockData) {
      this.http.put<{ order: string[] }>(`${environment.masterDataUrl}/admin/type-order`, { order }).subscribe({ error: () => {} });
      return;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TYPE_ORDER_STORAGE_KEY, JSON.stringify(order));
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values()));
  }
}

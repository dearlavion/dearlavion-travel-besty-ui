import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { slugify } from './slugify';
import { TAXONOMY_SEED_DATA } from './taxonomy-seed-data';

// The 8 option lists that drive the /travel survey and product tagging — see Kit Settings.
export type TaxonomyAxis =
  | 'destination'
  | 'season'
  | 'party'
  | 'transportation'
  | 'activity'
  | 'kitCategory'
  | 'duration'
  | 'gender';

export interface TaxonomyValue {
  id: string;
  axis: string;
  value: string; // editable display label, e.g. "Beach"
  order: number;
  emoji?: string;
  subtext?: string;
  // Only set for axis:'duration' — stable, non-admin-editable scoring key ('short'|'medium'|'long').
  // Every other axis leaves this unset and uses `value` itself as the key.
  code?: string;
}

export type NewTaxonomyValue = Omit<TaxonomyValue, 'id'>;

// The 8 axes' out-of-the-box display/step order — mirrors the backend's DEFAULT_AXIS_ORDER
// (axis-order.schema.ts), used both as the fallback before axisOrder has ever loaded and as the
// default the backend itself falls back to until an admin saves a custom order.
export const DEFAULT_AXIS_ORDER: TaxonomyAxis[] = [
  'destination',
  'season',
  'duration',
  'party',
  'transportation',
  'activity',
  'kitCategory',
  'gender',
];

const STORAGE_KEY = 'travel-besty-taxonomies';
const AXIS_ORDER_STORAGE_KEY = 'travel-besty-taxonomy-axis-order';
const PUBLIC_BASE = `${environment.apiUrl}/taxonomies`;
const ADMIN_BASE = `${environment.apiUrl}/admin/taxonomies`;
const AXIS_ORDER_PUBLIC = `${PUBLIC_BASE}/axis-order`;
const AXIS_ORDER_ADMIN = `${ADMIN_BASE}/axis-order`;

// SSR prerenders pages that read taxonomies (e.g. /travel, /shop) and Node has no localStorage —
// every read/write here must go through this guard or the build breaks.
function loadStored(): TaxonomyValue[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TaxonomyValue[];
  } catch {
    return null;
  }
}

function loadStoredAxisOrder(): string[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AXIS_ORDER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

/**
 * The 8 admin-editable option lists behind the /travel survey and product tagging (see Kit
 * Settings, /admin/kit-settings). Consumed by public pages (Travel, Shop, admin product form) as
 * well as the admin CRUD page itself, so — unlike the admin-only Users feature — this needs full
 * mock-mode support, same as ProductCatalogService/StoreSettingsService. Eager-loads in the
 * constructor (not a lazy ensureLoaded()) since nearly every consumer needs it immediately.
 */
@Injectable({ providedIn: 'root' })
export class TaxonomyService {
  private readonly http = inject(HttpClient);

  readonly values = signal<TaxonomyValue[]>(environment.useMockData ? (loadStored() ?? TAXONOMY_SEED_DATA) : []);

  // Admin-configurable order of the 8 axes — drives both Kit Settings' section order and the
  // /travel survey's step order, so the two always agree. Falls back to DEFAULT_AXIS_ORDER until
  // an admin has ever saved a custom one.
  readonly axisOrder = signal<string[]>(
    environment.useMockData ? (loadStoredAxisOrder() ?? DEFAULT_AXIS_ORDER) : DEFAULT_AXIS_ORDER,
  );

  constructor() {
    if (!environment.useMockData) {
      this.http.get<TaxonomyValue[]>(PUBLIC_BASE).subscribe({ next: (v) => this.values.set(v), error: () => {} });
      this.http
        .get<{ order: string[] }>(AXIS_ORDER_PUBLIC)
        .subscribe({ next: (res) => this.axisOrder.set(res.order), error: () => {} });
    }
  }

  /** Values for one axis, in display order. */
  forAxis(axis: TaxonomyAxis | string): TaxonomyValue[] {
    return this.values()
      .filter((v) => v.axis === axis)
      .sort((a, b) => a.order - b.order);
  }

  /** Admin: add a new option. Duration is fixed-cardinality — callers must not offer this for it. */
  create(input: NewTaxonomyValue): TaxonomyValue {
    if (!environment.useMockData) {
      this.http.post<TaxonomyValue>(ADMIN_BASE, input).subscribe({
        next: (created) => this.values.update((list) => [...list, created]),
        error: () => {},
      });
      // Callers don't use the return value in real mode (fire-and-forget, same as the HTTP path
      // above) — this placeholder just satisfies the synchronous signature mock mode still needs.
      return { ...input, id: `${input.axis}-${slugify(input.value)}` };
    }

    const id = `${input.axis}-${slugify(input.value)}`;
    const value: TaxonomyValue = { ...input, id };
    this.values.update((list) => [...list, value]);
    this.persist();
    return value;
  }

  /** Admin: rename a label, change its order, or edit emoji/subtext. Never touches `code`. */
  update(id: string, patch: Partial<Pick<TaxonomyValue, 'value' | 'order' | 'emoji' | 'subtext'>>): void {
    if (!environment.useMockData) {
      this.values.update((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
      this.http.put<TaxonomyValue>(`${ADMIN_BASE}/${id}`, patch).subscribe({
        next: (updated) => this.values.update((list) => list.map((v) => (v.id === id ? updated : v))),
        error: () => {},
      });
      return;
    }

    this.values.update((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    this.persist();
  }

  /** Admin: remove an option. Duration is fixed-cardinality — callers must not offer this for it. */
  delete(id: string): void {
    if (!environment.useMockData) {
      this.http.delete(`${ADMIN_BASE}/${id}`).subscribe({
        next: () => this.values.update((list) => list.filter((v) => v.id !== id)),
        error: () => {},
      });
      return;
    }

    this.values.update((list) => list.filter((v) => v.id !== id));
    this.persist();
  }

  /** Admin: save a new axis order (drag-and-drop on Kit Settings). Applied optimistically so the
   * page and /travel both reflect it immediately, same pattern as update()/create()/delete(). */
  updateAxisOrder(order: string[]): void {
    this.axisOrder.set(order);
    if (!environment.useMockData) {
      this.http.put<{ order: string[] }>(AXIS_ORDER_ADMIN, { order }).subscribe({ error: () => {} });
      return;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AXIS_ORDER_STORAGE_KEY, JSON.stringify(order));
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values()));
  }
}

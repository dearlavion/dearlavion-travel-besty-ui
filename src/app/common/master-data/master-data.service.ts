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
  | 'gender'
  // What a product IS (one per product, drives the shop). Distinct from kitCategory, which is what
  // a product is PACKED IN (several per product, drives the survey).
  | 'productCategory';

export interface MasterDataCollection {
  key: string;
  label: string;
  /**
   * REST path segment on dearlavion-spring-master-data-service, relative to its root: a built-in's
   * own resource (`destinations`) or `collections/<key>/items` for an admin-created one. Writes are
   * always at `admin/<path>`, so this single field builds every URL either way.
   */
  path: string;
  /** The 8 originals — renameable, but never deletable (see the service's CollectionRegistryService). */
  builtIn: boolean;
}

// The 8 originals, as the backend seeds them into its `collections` registry. Used as mock-mode
// seed data and as the fallback if GET /collections fails, so the app still works offline — the
// registry itself is the source of truth in real mode, and it can hold admin-created collections
// beyond these.
export const BUILT_IN_COLLECTIONS: MasterDataCollection[] = [
  { key: 'destination', label: 'Destinations', path: 'destinations', builtIn: true },
  { key: 'season', label: 'Seasons', path: 'seasons', builtIn: true },
  { key: 'party', label: 'Parties', path: 'parties', builtIn: true },
  { key: 'transportation', label: 'Transportation', path: 'transportation-modes', builtIn: true },
  { key: 'activity', label: 'Activities', path: 'activities', builtIn: true },
  { key: 'kitCategory', label: 'Kit Categories', path: 'kit-categories', builtIn: true },
  { key: 'duration', label: 'Durations', path: 'durations', builtIn: true },
  { key: 'gender', label: 'Genders', path: 'genders', builtIn: true },
  { key: 'productCategory', label: 'Product Categories', path: 'product-categories', builtIn: true },
];

/** Path convention for an admin-created collection — mirrors CollectionDefinition.customPath(). */
export function customCollectionPath(key: string): string {
  return `collections/${key}/items`;
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

/** How one collection behaves as a survey question — set per section on admin Kit Settings. */
export interface SectionSettings {
  required: boolean;
  multiple: boolean;
}

/** Falls back to required + single-select, matching the backend's own default for an unknown key. */
export const DEFAULT_SECTION_SETTINGS: SectionSettings = { required: true, multiple: false };

// Mirrors KitSettings.defaultSections() on the backend — today's actual survey behaviour, so
// defaulting changes nothing until an admin edits it.
export const DEFAULT_SECTION_SETTINGS_BY_TYPE: Record<string, SectionSettings> = {
  destination: { required: true, multiple: true },
  season: { required: true, multiple: false },
  duration: { required: true, multiple: false },
  party: { required: true, multiple: false },
  transportation: { required: true, multiple: false },
  activity: { required: false, multiple: true },
  kitCategory: { required: true, multiple: true },
  gender: { required: false, multiple: false },
};

/** Mirrors KitSettings.DEFAULT_PRODUCT_ORDER — Category and Kit Categories lead, both required. */
export const DEFAULT_PRODUCT_FORM_ORDER = [
  'productCategory',
  'kitCategory',
  'destination',
  'season',
  'duration',
  'party',
  'transportation',
  'activity',
  'gender',
];

// Mirrors KitSettings.defaultProductSections(). Deliberately not the survey's shapes: a shopper
// picks one trip length and one gender, but a product's `durations`/`genders` are arrays.
export const DEFAULT_PRODUCT_FORM_SETTINGS: Record<string, SectionSettings> = {
  productCategory: { required: true, multiple: false },
  kitCategory: { required: true, multiple: true },
  destination: { required: false, multiple: true },
  season: { required: false, multiple: true },
  duration: { required: false, multiple: true },
  party: { required: false, multiple: true },
  transportation: { required: false, multiple: true },
  activity: { required: false, multiple: true },
  gender: { required: false, multiple: true },
};

interface KitSettingsResponse {
  order?: string[];
  sections?: Record<string, SectionSettings>;
  survey?: { order: string[]; sections: Record<string, SectionSettings> };
  productForm?: { order: string[]; sections: Record<string, SectionSettings> };
}

const STORAGE_KEY = 'travel-besty-master-data';
const TYPE_ORDER_STORAGE_KEY = 'travel-besty-master-data-type-order';
const SECTION_SETTINGS_STORAGE_KEY = 'travel-besty-master-data-section-settings';
const COLLECTIONS_STORAGE_KEY = 'travel-besty-master-data-collections';

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

function loadStoredSectionSettings(): Record<string, SectionSettings> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SECTION_SETTINGS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, SectionSettings>;
  } catch {
    return null;
  }
}

function loadStoredCollections(): MasterDataCollection[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MasterDataCollection[];
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

  /** Every collection this service knows about — the 8 built-ins plus any an admin has created. */
  readonly collections = signal<MasterDataCollection[]>(
    environment.useMockData ? (loadStoredCollections() ?? BUILT_IN_COLLECTIONS) : BUILT_IN_COLLECTIONS,
  );

  /**
   * True once GET /collections has come back (either way). Until then `collections()` holds only
   * the built-in fallback, so a page asked for an admin-created key must show "loading" rather than
   * "no such collection" — mock mode is synchronous and starts true.
   */
  readonly registryLoaded = signal(environment.useMockData);

  // Admin-configurable order of the 8 types — drives both Kit Settings' section order and the
  // /travel survey's step order, so the two always agree. Falls back to DEFAULT_TYPE_ORDER until
  // an admin has ever saved a custom one.
  readonly typeOrder = signal<string[]>(
    environment.useMockData ? (loadStoredTypeOrder() ?? DEFAULT_TYPE_ORDER) : DEFAULT_TYPE_ORDER,
  );

  /**
   * What the admin product form shows: which collections a product can be tagged with, in what
   * order. Separate from the survey's list because the two answer different questions about the
   * same collection — a shopper picks one trip length, a product suits several.
   */
  readonly productFormOrder = signal<string[]>(DEFAULT_PRODUCT_FORM_ORDER);
  readonly productFormSettings = signal<Record<string, SectionSettings>>(DEFAULT_PRODUCT_FORM_SETTINGS);

  /** Per-collection survey behaviour (optional/required, single/multiple), keyed by collection key. */
  readonly sectionSettings = signal<Record<string, SectionSettings>>(
    environment.useMockData
      ? (loadStoredSectionSettings() ?? DEFAULT_SECTION_SETTINGS_BY_TYPE)
      : DEFAULT_SECTION_SETTINGS_BY_TYPE,
  );

  constructor() {
    if (!environment.useMockData) {
      // The registry drives everything: which collections exist (built-in or admin-created) and
      // where each one's values live. Values can only be fetched once it lands, so that request
      // chains off this one rather than running in parallel with it.
      this.http.get<MasterDataCollection[]>(`${environment.masterDataUrl}/collections`).subscribe({
        next: (list) => {
          this.collections.set(list);
          this.registryLoaded.set(true);
          list.forEach((collection) => this.loadValues(collection));
        },
        // Keep the app usable against the built-ins if the registry endpoint is unavailable (an
        // older deploy of the service, say) — only admin-created collections are lost.
        error: () => {
          this.collections.set(BUILT_IN_COLLECTIONS);
          this.registryLoaded.set(true);
          BUILT_IN_COLLECTIONS.forEach((collection) => this.loadValues(collection));
        },
      });
      // Kit settings live on store-engine (environment.apiUrl), not master-data: that service owns
      // the survey engine these settings configure, while master-data owns the option lists whose
      // keys they reference.
      this.http
        .get<KitSettingsResponse>(`${environment.apiUrl}/kit-settings`)
        .subscribe({
          next: (res) => {
            // `survey` is the split-out shape; the top-level order/sections is the same data
            // repeated for clients written before the split.
            const survey = res.survey ?? res;
            if (survey.order?.length) this.typeOrder.set(survey.order);
            if (survey.sections) this.sectionSettings.set(survey.sections);
            if (res.productForm?.order?.length) this.productFormOrder.set(res.productForm.order);
            if (res.productForm?.sections) this.productFormSettings.set(res.productForm.sections);
          },
          error: () => {},
        });
    }
  }

  // Each collection is its own resource — there's no combined "all values" endpoint — so these are
  // flattened into one cached signal to keep the eager, always-available forType() shape.
  private loadValues(collection: MasterDataCollection): void {
    this.http.get<Omit<MasterDataValue, 'type'>[]>(`${environment.masterDataUrl}/${collection.path}`).subscribe({
      next: (items) => {
        const withType = items.map((i) => ({ ...i, type: collection.key }));
        this.values.update((list) => [...list.filter((v) => v.type !== collection.key), ...withType]);
      },
      error: () => {},
    });
  }

  private pathFor(type: string): string {
    return this.collections().find((c) => c.key === type)?.path ?? type;
  }

  /** Values for one type, in display order. */
  forType(type: MasterDataType | string): MasterDataValue[] {
    return this.values()
      .filter((v) => v.type === type)
      .sort((a, b) => a.order - b.order);
  }

  /** Admin: add a new option. Duration is fixed-cardinality — callers must not offer this for it. */
  create(input: NewMasterDataValue): MasterDataValue {
    const path = this.pathFor(input.type);
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
      const path = this.pathFor(type);
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
      const path = this.pathFor(type);
      this.http.delete(`${environment.masterDataUrl}/admin/${path}/${id}`).subscribe({
        next: () => this.values.update((list) => list.filter((v) => v.id !== id)),
        error: () => {},
      });
      return;
    }

    this.values.update((list) => list.filter((v) => v.id !== id));
    this.persist();
  }

  /** Settings for one collection as a survey question, falling back to required + single-select. */
  settingsFor(type: string): SectionSettings {
    return this.sectionSettings()[type] ?? DEFAULT_SECTION_SETTINGS;
  }

  /**
   * Settings for one collection as a product form field. A collection with no entry defaults to an
   * optional multi-select — every product axis is a list, and empty means "suits all".
   */
  productSettingsFor(type: string): SectionSettings {
    return this.productFormSettings()[type] ?? { required: false, multiple: true };
  }

  /** Admin: save the product form's field list and per-field shape. */
  updateProductFormSettings(order?: string[], sections?: Record<string, SectionSettings>): void {
    if (order) this.productFormOrder.set(order);
    if (sections) this.productFormSettings.set(sections);
    if (!environment.useMockData) {
      const body: { order?: string[]; sections?: Record<string, SectionSettings> } = {};
      if (order) body.order = order;
      if (sections) body.sections = sections;
      this.http.put(`${environment.apiUrl}/admin/kit-settings/product-form`, body).subscribe({ error: () => {} });
    }
  }

  /**
   * Admin: save the question order and/or each question's behaviour (Kit Settings). Applied
   * optimistically so the page and /travel both reflect it immediately, same pattern as
   * update()/create()/delete(). Either argument may be omitted — the backend merges what it gets.
   */
  updateKitSettings(order?: string[], sections?: Record<string, SectionSettings>): void {
    if (order) this.typeOrder.set(order);
    if (sections) this.sectionSettings.set(sections);

    if (!environment.useMockData) {
      const body: { order?: string[]; sections?: Record<string, SectionSettings> } = {};
      if (order) body.order = order;
      if (sections) body.sections = sections;
      this.http.put(`${environment.apiUrl}/admin/kit-settings`, body).subscribe({ error: () => {} });
      return;
    }
    if (typeof window !== 'undefined') {
      if (order) window.localStorage.setItem(TYPE_ORDER_STORAGE_KEY, JSON.stringify(order));
      if (sections) window.localStorage.setItem(SECTION_SETTINGS_STORAGE_KEY, JSON.stringify(sections));
    }
  }

  /** Order-only convenience — used when deleting a collection drops it from the survey. */
  updateTypeOrder(order: string[]): void {
    this.updateKitSettings(order);
  }

  // ── Collections themselves (create/rename/delete), as opposed to the values inside one ────────

  /**
   * Admin: register a new collection. `key` is derived from the label by the backend when omitted;
   * the optimistic row below mirrors that derivation so mock mode and the pre-response UI agree.
   * The callback fires with the created collection so callers can navigate straight into it.
   */
  createCollection(label: string, onCreated?: (collection: MasterDataCollection) => void): void {
    const trimmed = label.trim();
    const key = deriveCollectionKey(trimmed);
    const collection: MasterDataCollection = { key, label: trimmed, path: customCollectionPath(key), builtIn: false };

    if (!environment.useMockData) {
      this.http
        .post<MasterDataCollection>(`${environment.masterDataUrl}/admin/collections`, { label: trimmed })
        .subscribe({
          next: (created) => {
            this.collections.update((list) => [...list.filter((c) => c.key !== created.key), created]);
            onCreated?.(created);
          },
          error: () => {},
        });
      return;
    }

    this.collections.update((list) => [...list, collection]);
    this.persistCollections();
    onCreated?.(collection);
  }

  /** Admin: rename any collection — built-ins included, since only their key is immutable. */
  renameCollection(key: string, label: string): void {
    const trimmed = label.trim();
    this.collections.update((list) => list.map((c) => (c.key === key ? { ...c, label: trimmed } : c)));
    if (!environment.useMockData) {
      this.http
        .put<MasterDataCollection>(`${environment.masterDataUrl}/admin/collections/${key}`, { label: trimmed })
        .subscribe({ error: () => {} });
      return;
    }
    this.persistCollections();
  }

  /**
   * Admin: delete an admin-created collection and every value in it. Built-ins are refused by the
   * backend (their keys are referenced by name in the survey and kit-scoring engine), so callers
   * must not offer this for them.
   */
  deleteCollection(key: string): void {
    this.collections.update((list) => list.filter((c) => c.key !== key));
    this.values.update((list) => list.filter((v) => v.type !== key));
    // A deleted collection must not linger in the survey's step order.
    this.updateTypeOrder(this.typeOrder().filter((type) => type !== key));

    if (!environment.useMockData) {
      this.http.delete(`${environment.masterDataUrl}/admin/collections/${key}`).subscribe({ error: () => {} });
      return;
    }
    this.persistCollections();
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values()));
  }

  private persistCollections(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(this.collections()));
  }
}

/** "Fabric Types" -> "fabricTypes" — mirrors CollectionRegistryService.deriveKey() on the backend. */
export function deriveCollectionKey(label: string): string {
  const words = label.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  const key = words
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join('');
  return /^\d/.test(key) ? `c${key}` : key;
}

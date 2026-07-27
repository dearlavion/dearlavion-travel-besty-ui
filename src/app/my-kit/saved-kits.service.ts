import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { BuiltKit } from '../travel/travel-kit.service';
import { KitItem } from '../travel/kit-recommendation';
import { AuthService } from '../auth/auth.service';
import { slugify } from '../common/slugify';
import { environment } from '../../environments/environment';

export interface SavedKit {
  id: string;
  name: string;
  kit: BuiltKit;
  savedAt: string;
}

const STORAGE_KEY = 'travel-besty-saved-kits';
const API_BASE = `${environment.apiUrl}/kits`;

// SSR prerenders routes and Node has no localStorage — every read/write must go through this
// guard (same pattern as ProductCatalogService / CartService).
function loadStored(): SavedKit[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedKit[];
  } catch {
    return [];
  }
}

/** Persists named travel kits so a user can keep several and reload them later — localStorage in
 * mock mode, the backend's `/kits` (auth-scoped) collection in real-backend mode. */
@Injectable({ providedIn: 'root' })
export class SavedKitsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly kits = signal<SavedKit[]>(environment.useMockData ? loadStored() : []);

  // True once `kits` reflects real data — immediately in mock mode (already synchronous) or when
  // logged out (nothing to fetch), only after the real-mode GET resolves otherwise. Lets a direct
  // visit/refresh on /profile/collection/:id tell "still loading" apart from "genuinely no such
  // kit" instead of a one-shot check racing the fetch — same pattern as ProductCatalogService.loaded.
  readonly loaded = signal(environment.useMockData || !this.auth.token());

  constructor() {
    // /kits is auth-guarded — skip the request when logged out (guaranteed 403 otherwise) and
    // always attach an error handler, since an unhandled subscribe error becomes an uncaught
    // exception rather than just a rejected promise.
    if (!environment.useMockData && this.auth.token()) {
      this.http.get<SavedKit[]>(API_BASE).subscribe({
        next: (res) => {
          this.kits.set(res);
          this.loaded.set(true);
        },
        error: () => this.loaded.set(true),
      });
    }
  }

  save(name: string, kit: BuiltKit): SavedKit {
    const cleanName = name.trim() || 'My kit';

    if (!environment.useMockData) {
      this.http.post<SavedKit>(API_BASE, { name: cleanName, kit }).subscribe({
        next: (created) => this.kits.update((list) => [created, ...list]),
        error: () => {},
      });
      // Callers only read `.name` off the return value (for a confirmation toast) — safe to hand
      // back a placeholder since the real entry (with its server-assigned id) lands in `kits`
      // once the POST resolves.
      return { id: '', name: cleanName, kit, savedAt: new Date().toISOString() };
    }

    // Id is a slugified name, fixed at creation — mirrors ProductCatalogService.addProduct()'s
    // slug + collision-suffix scheme (and the backend's own CollectionService.uniqueId()), so
    // /profile/collection/:id reads as the kit's own name instead of an opaque token.
    const baseId = slugify(cleanName) || 'kit';
    const existingIds = new Set(this.kits().map((k) => k.id));
    let id = baseId;
    for (let i = 2; existingIds.has(id); i++) {
      id = `${baseId}-${i}`;
    }

    const entry: SavedKit = {
      id,
      name: cleanName,
      kit,
      savedAt: new Date().toISOString(),
    };
    // Newest first.
    this.kits.update((list) => [entry, ...list]);
    this.persist();
    return entry;
  }

  /** Replaces this kit's item list — backs manual add/remove on /my-kit/:savedId. */
  updateItems(id: string, items: KitItem[]): void {
    // Optimistic in both modes — matches save()/delete()'s existing pattern in this file.
    this.kits.update((list) => list.map((k) => (k.id === id ? { ...k, kit: { ...k.kit, items } } : k)));

    if (!environment.useMockData) {
      this.http.patch<SavedKit>(`${API_BASE}/${id}`, { items }).subscribe({ error: () => {} });
      return;
    }
    this.persist();
  }

  delete(id: string): void {
    if (!environment.useMockData) {
      this.kits.update((list) => list.filter((k) => k.id !== id));
      this.http.delete(`${API_BASE}/${id}`).subscribe({ error: () => {} });
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

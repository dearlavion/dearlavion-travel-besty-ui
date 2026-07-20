import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { BuiltKit } from '../travel/travel-kit.service';
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

  readonly kits = signal<SavedKit[]>(environment.useMockData ? loadStored() : []);

  constructor() {
    if (!environment.useMockData) {
      this.http.get<SavedKit[]>(API_BASE).subscribe((res) => this.kits.set(res));
    }
  }

  save(name: string, kit: BuiltKit): SavedKit {
    const cleanName = name.trim() || 'My kit';

    if (!environment.useMockData) {
      this.http.post<SavedKit>(API_BASE, { name: cleanName, kit }).subscribe((created) => {
        this.kits.update((list) => [created, ...list]);
      });
      // Callers only read `.name` off the return value (for a confirmation toast) — safe to hand
      // back a placeholder since the real entry lands in `kits` once the POST resolves.
      return { id: '', name: cleanName, kit, savedAt: new Date().toISOString() };
    }

    const entry: SavedKit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      kit,
      savedAt: new Date().toISOString(),
    };
    // Newest first.
    this.kits.update((list) => [entry, ...list]);
    this.persist();
    return entry;
  }

  delete(id: string): void {
    if (!environment.useMockData) {
      this.kits.update((list) => list.filter((k) => k.id !== id));
      this.http.delete(`${API_BASE}/${id}`).subscribe();
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

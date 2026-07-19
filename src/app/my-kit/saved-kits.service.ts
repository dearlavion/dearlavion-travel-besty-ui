import { Injectable, signal } from '@angular/core';
import { BuiltKit } from '../travel/travel-kit.service';

export interface SavedKit {
  id: string;
  name: string;
  kit: BuiltKit;
  savedAt: string;
}

const STORAGE_KEY = 'travel-besty-saved-kits';

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

/** Persists named travel kits to localStorage so a user can keep several and reload them later. */
@Injectable({ providedIn: 'root' })
export class SavedKitsService {
  readonly kits = signal<SavedKit[]>(loadStored());

  save(name: string, kit: BuiltKit): SavedKit {
    const entry: SavedKit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || 'My kit',
      kit,
      savedAt: new Date().toISOString(),
    };
    // Newest first.
    this.kits.update((list) => [entry, ...list]);
    this.persist();
    return entry;
  }

  delete(id: string): void {
    this.kits.update((list) => list.filter((k) => k.id !== id));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.kits()));
  }
}

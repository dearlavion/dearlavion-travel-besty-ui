import { Injectable, signal } from '@angular/core';
import { KitItem } from './kit-recommendation';

export interface BuiltKit {
  items: KitItem[];
  summary: string;
}

// Holds the most recently built kit so /my-kit can read it after the quiz's reveal step
// navigates there. In-memory only (no backend, no persistence) — matches the rest of this
// app's mock-data scope; a fresh page load naturally resets it.
@Injectable({ providedIn: 'root' })
export class TravelKitService {
  readonly currentKit = signal<BuiltKit | null>(null);

  setKit(kit: BuiltKit): void {
    this.currentKit.set(kit);
  }
}

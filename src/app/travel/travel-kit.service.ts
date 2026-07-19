import { Injectable, signal } from '@angular/core';
import { KitItem } from './kit-recommendation';

export interface BuiltKit {
  items: KitItem[];
  summary: string;
  // Set when a kit comes from a pre-built source (e.g. a homepage "Popular kits" card) so
  // /my-kit can show that kit's own name instead of the generic quiz-flow title.
  title?: string;
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

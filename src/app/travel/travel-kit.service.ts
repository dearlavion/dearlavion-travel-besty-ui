import { Injectable, signal } from '@angular/core';
import { KitItem } from './kit-recommendation';

/** One survey question and what the shopper answered, ready to render. */
export interface KitAnswerSummary {
  label: string;
  value: string;
}

export interface BuiltKit {
  items: KitItem[];
  summary: string;
  // What the shopper actually answered, in the survey's own order — /my-kit shows it so the kit's
  // contents can be read against the trip they describe. Resolved to display labels here (duration
  // as "A short trip", not the `short` code) because the survey owns that mapping, not /my-kit.
  answers?: KitAnswerSummary[];
  // Set when a kit comes from a pre-built source (e.g. a homepage "Popular kits" card) so
  // /my-kit can show that kit's own name instead of the generic quiz-flow title.
  title?: string;
  // Human-readable destination(s) (e.g. "Beach" or "Beach and Mountains") — undefined when the
  // quiz answered "All"/unrestricted. Used for "Email my kit"'s subject line.
  destination?: string;
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

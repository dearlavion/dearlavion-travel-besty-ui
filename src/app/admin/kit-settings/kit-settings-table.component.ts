import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MasterDataCollection, SectionSettings } from '../../common/master-data/master-data.service';

export interface KitSettingsSave {
  order: string[];
  sections: Record<string, SectionSettings>;
}

/**
 * One context's collection list — order, and how each collection behaves in that context. Rendered
 * twice on Kit Settings: once for the /travel survey's questions, once for the admin product form's
 * fields. They're separate because the same flags mean different things in each: `multiple` on the
 * survey is "the shopper may pick several", on the product form it's "the product may hold
 * several", and those genuinely differ (one trip length per trip, several per product).
 *
 * Owns its own drafts and validation so the two tables can be edited and saved independently.
 */
@Component({
  selector: 'app-kit-settings-table',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './kit-settings-table.component.html',
  styleUrl: './admin-kit-settings.component.css',
})
export class KitSettingsTableComponent {
  readonly title = input.required<string>();
  readonly blurb = input.required<string>();
  /** Every registered collection, so this can resolve labels and offer what's missing. */
  readonly allCollections = input.required<MasterDataCollection[]>();
  readonly order = input.required<string[]>();
  readonly settings = input.required<Record<string, SectionSettings>>();
  readonly descriptions = input<Record<string, string | undefined>>({});
  readonly valueCounts = input<Record<string, number | undefined>>({});
  /** Wording differs per context — "question" vs "field". */
  readonly itemNoun = input('question');
  /** Small label above the title saying where this list actually shows up. */
  readonly eyebrow = input('');

  readonly save = output<KitSettingsSave>();
  readonly addCollection = output<string>();
  readonly removeCollection = output<string>();

  protected readonly rows = computed(() => {
    const byKey = new Map(this.allCollections().map((c) => [c.key, c]));
    return this.order()
      .map((key) => byKey.get(key))
      .filter((c): c is MasterDataCollection => !!c);
  });

  protected readonly available = computed(() => {
    const present = new Set(this.order());
    return this.allCollections().filter((c) => !present.has(c.key));
  });

  // ── Drafts ────────────────────────────────────────────────────────────────────────────────────
  // Re-seeded from the inputs until the admin touches something; after that their edits win, so an
  // async settings load (or the post-save signal update) can't wipe work in progress.
  protected readonly orderDrafts = signal<Record<string, number | null>>({});
  protected readonly settingsDrafts = signal<Record<string, SectionSettings>>({});
  private readonly edited = signal(false);

  constructor() {
    effect(() => {
      const rows = this.rows();
      const settings = this.settings();
      if (this.edited()) return;
      const orders: Record<string, number | null> = {};
      const shapes: Record<string, SectionSettings> = {};
      rows.forEach((c, i) => {
        orders[c.key] = i + 1;
        shapes[c.key] = { ...(settings[c.key] ?? { required: false, multiple: true }) };
      });
      this.orderDrafts.set(orders);
      this.settingsDrafts.set(shapes);
    });
  }

  protected orderDraftFor(key: string): number | null {
    return this.orderDrafts()[key] ?? null;
  }

  protected settingsDraftFor(key: string): SectionSettings {
    return this.settingsDrafts()[key] ?? this.settings()[key] ?? { required: false, multiple: true };
  }

  protected setOrderDraft(key: string, value: unknown): void {
    this.edited.set(true);
    const parsed = value === '' || value === null || value === undefined ? null : Number(value);
    this.orderDrafts.update((d) => ({ ...d, [key]: parsed !== null && Number.isFinite(parsed) ? parsed : null }));
  }

  protected setRequired(key: string, required: boolean): void {
    this.edited.set(true);
    this.settingsDrafts.update((d) => ({ ...d, [key]: { ...this.settingsDraftFor(key), required } }));
  }

  protected setMultiple(key: string, multiple: boolean): void {
    this.edited.set(true);
    this.settingsDrafts.update((d) => ({ ...d, [key]: { ...this.settingsDraftFor(key), multiple } }));
  }

  protected readonly duplicateOrders = computed<number[]>(() => {
    const counts = new Map<number, number>();
    for (const c of this.rows()) {
      const v = this.orderDrafts()[c.key];
      if (v === null || v === undefined) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n > 1).map(([v]) => v).sort((a, b) => a - b);
  });

  protected isDuplicateOrder(key: string): boolean {
    const v = this.orderDrafts()[key];
    return v !== null && v !== undefined && this.duplicateOrders().includes(v);
  }

  // Names the clashing rows, not just the numbers — a clash can sit off-screen in a long list.
  protected readonly orderError = computed<string | null>(() => {
    const duplicates = this.duplicateOrders();
    if (duplicates.length > 0) {
      const clashes = duplicates.map((position) => {
        const titles = this.rows()
          .filter((c) => this.orderDrafts()[c.key] === position)
          .map((c) => c.label)
          .join(', ');
        return `${titles} all sit at ${position}`;
      });
      return `Each ${this.itemNoun()} needs its own position — ${clashes.join('; ')}.`;
    }
    const invalid = this.rows().filter((c) => {
      const v = this.orderDrafts()[c.key];
      return v === null || v === undefined || !Number.isInteger(v) || v < 1;
    });
    if (invalid.length > 0) {
      return `Every ${this.itemNoun()} needs a whole-number position of 1 or higher — check ${invalid
        .map((c) => c.label)
        .join(', ')}.`;
    }
    return null;
  });

  protected onSave(): void {
    if (this.orderError()) return;
    const order = [...this.rows()]
      .sort((a, b) => (this.orderDrafts()[a.key] ?? 0) - (this.orderDrafts()[b.key] ?? 0))
      .map((c) => c.key);
    this.save.emit({ order, sections: this.settingsDrafts() });
  }

  protected readonly confirmingRemoveKey = signal<string | null>(null);

  protected labelFor(key: string): string {
    return this.allCollections().find((c) => c.key === key)?.label ?? key;
  }
}

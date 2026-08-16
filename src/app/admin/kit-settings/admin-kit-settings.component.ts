import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MasterDataService,
    SectionSettings,
} from '../../common/master-data/master-data.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';
import { ToastService } from '../../common/toast/toast.service';

interface KitSettingsSection {
  axis: string;
  title: string;
  description: string;
}

// Matches the other admin lists (Users, Products, Master Data). With only 8 sections today that
// means a single page and no pager — <app-pagination> hides itself below two pages.
const PAGE_SIZE = 10;

// Per-axis metadata (title, description) — unordered. Display order is driven separately by
// masterData.typeOrder() (see the `sections` computed below), so the rows can be reordered via
// their Order inputs without touching this config.
// Copy only — which sections exist comes from the live collections registry, not this list. An
// admin-created collection simply has no entry and shows its own label with no description.
const DESCRIPTIONS: Record<string, string> = {
  destination: 'Where a trip is headed — powers the /travel survey and product tagging.',
  season: 'What the weather will be like — powers the /travel survey and product tagging.',
  party: 'Who is traveling — powers the /travel survey and product tagging.',
  transportation: 'How they are getting there — powers the /travel survey and product tagging.',
  activity: 'What they will be doing — powers the /travel survey and product tagging.',
  kitCategory: 'Packing-list buckets — powers the survey\'s "what matters most" question and product tagging.',
  duration: 'Trip length bands — fixed at exactly 4, since the kit-sizing engine keys off them directly.',
  gender: 'Collected on the survey for sizing — not yet tied to product tagging.',
  productCategory: 'What a product is — drives the shop card and the kit\'s breadth, not the survey.',
};

// Sets the order of the 8 master-data sections — which one the /travel survey asks about first.
// Editing the values inside a section (add/rename/remove/order) lives on /admin/master-data, which
// every collection name here links straight into.
@Component({
  selector: 'app-admin-kit-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './admin-kit-settings.component.html',
  styleUrl: './admin-kit-settings.component.css',
})
export class AdminKitSettingsComponent {
  protected readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);

  // Rows render in masterData.typeOrder()'s order — reordering here is what a shopper actually
  // sees as the /travel survey's step order (see TravelComponent.orderedAxes()), so the two never
  // disagree. Falls back to appending any axis SECTION_CONFIG defines that typeOrder() hasn't
  // caught up to yet (defensive — shouldn't normally happen).
  /** The collections the survey actually asks about, in its order. */
  protected readonly sections = computed<KitSettingsSection[]>(() => {
    const byKey = new Map(this.masterData.collections().map((c) => [c.key, c]));
    return this.masterData
      .typeOrder()
      .map((key) => byKey.get(key))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({ axis: c.key, title: c.label, description: DESCRIPTIONS[c.key] ?? '' }));
  });

  /**
   * Registered collections the survey doesn't ask about — available to add. Being absent here is
   * what "not a survey question" means: productCategory sits out by design (it describes a product,
   * it isn't something to ask a shopper), and a newly created collection starts out here.
   */
  protected readonly availableCollections = computed(() => {
    const inSurvey = new Set(this.masterData.typeOrder());
    return this.masterData.collections().filter((c) => !inSurvey.has(c.key));
  });

  /** Appended last so it doesn't silently reorder the existing questions. */
  protected addToSurvey(key: string, label: string): void {
    this.masterData.updateKitSettings([...this.masterData.typeOrder(), key]);
    this.toast.showAndReload(`Added "${label}" to the survey`, 'success');
  }

  /** Removes the question only — the collection and its values stay in Master Data. */
  protected removeFromSurvey(key: string, label: string): void {
    this.masterData.updateKitSettings(this.masterData.typeOrder().filter((k) => k !== key));
    this.toast.showAndReload(`Removed "${label}" from the survey — the collection itself is untouched`, 'success');
  }

  protected readonly confirmingRemoveKey = signal<string | null>(null);

  protected valueCount(axis: string): number {
    return this.masterData.forType(axis).length;
  }

  // ── Paging ─────────────────────────────────────────────────────────────────────────────────
  // Order drafts are keyed by axis, not by row index, so edits survive paging and Save always
  // validates and writes all 8 sections at once regardless of which page is showing.
  protected readonly page = signal(0); // 0-indexed

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sections().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedSections = computed<KitSettingsSection[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.sections().slice(start, start + PAGE_SIZE);
  });

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  // ── Section reordering — one 1-based order input per row, applied together on Save. This
  // reorders which section comes first (and which step the /travel survey asks first). The order
  // of the *values within* a section isn't set here at all: that's each value's own `order` field,
  // edited on /admin/master-data. Nothing is written until the whole set validates, so the list
  // can never be left with a duplicate or missing position mid-edit. ─────────────────────────────
  protected readonly orderDrafts = signal<Record<string, number | null>>({});

  // Behaviour drafts (optional/required, single/multiple) — saved together with the order by the
  // one Save button, so a single PUT carries the whole page's state.
  protected readonly settingsDrafts = signal<Record<string, SectionSettings>>({});

  // Once the admin touches any input, stop re-seeding drafts from typeOrder() — otherwise real
  // mode's async /type-order response (or the post-save signal update) would wipe their edits.
  private readonly orderEdited = signal(false);

  constructor() {
    effect(() => {
      const sections = this.sections();
      const order = this.masterData.typeOrder();
      this.masterData.sectionSettings(); // re-seed when the saved settings land too
      if (this.orderEdited()) return;
      const drafts: Record<string, number | null> = {};
      sections.forEach((section, i) => {
        const at = order.indexOf(section.axis);
        drafts[section.axis] = (at === -1 ? i : at) + 1;
      });
      this.orderDrafts.set(drafts);
      const settings: Record<string, SectionSettings> = {};
      sections.forEach((section) => {
        settings[section.axis] = { ...this.masterData.settingsFor(section.axis) };
      });
      this.settingsDrafts.set(settings);
    });
  }

  protected settingsDraftFor(axis: string): SectionSettings {
    return this.settingsDrafts()[axis] ?? this.masterData.settingsFor(axis);
  }

  protected setRequired(axis: string, required: boolean): void {
    this.orderEdited.set(true); // stop the effect re-seeding over the admin's edits
    this.settingsDrafts.update((d) => ({ ...d, [axis]: { ...this.settingsDraftFor(axis), required } }));
  }

  protected setMultiple(axis: string, multiple: boolean): void {
    this.orderEdited.set(true);
    this.settingsDrafts.update((d) => ({ ...d, [axis]: { ...this.settingsDraftFor(axis), multiple } }));
  }

  protected orderDraftFor(axis: string): number | null {
    return this.orderDrafts()[axis] ?? null;
  }

  protected setOrderDraft(axis: string, value: unknown): void {
    this.orderEdited.set(true);
    // A cleared number input hands back '' / null — keep it as null so it reads as "missing" to
    // the validators below rather than silently collapsing to 0.
    const parsed = value === '' || value === null || value === undefined ? null : Number(value);
    this.orderDrafts.update((d) => ({ ...d, [axis]: parsed !== null && Number.isFinite(parsed) ? parsed : null }));
  }

  /** Positions typed more than once — every row sharing one is flagged and Save is blocked. */
  protected readonly duplicateOrders = computed<number[]>(() => {
    const counts = new Map<number, number>();
    for (const value of Object.values(this.orderDrafts())) {
      if (value === null) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([value]) => value)
      .sort((a, b) => a - b);
  });

  /** Blank, fractional, or below-1 positions — also blocks Save. */
  private readonly invalidSections = computed<KitSettingsSection[]>(() =>
    this.sections().filter((section) => {
      const value = this.orderDrafts()[section.axis];
      return value === null || value === undefined || !Number.isInteger(value) || value < 1;
    }),
  );

  // Names the clashing sections, not just the numbers — a duplicate can sit on a page the admin
  // isn't looking at, so the message has to be readable without the row highlight next to it.
  protected readonly orderError = computed<string | null>(() => {
    const duplicates = this.duplicateOrders();
    if (duplicates.length > 0) {
      const clashes = duplicates.map((position) => {
        const titles = this.sections()
          .filter((s) => this.orderDrafts()[s.axis] === position)
          .map((s) => s.title)
          .join(', ');
        return `${titles} all sit at ${position}`;
      });
      return `Each section needs its own position — ${clashes.join('; ')}.`;
    }
    const invalid = this.invalidSections();
    if (invalid.length > 0) {
      return `Every section needs a whole-number position of 1 or higher — check ${invalid.map((s) => s.title).join(', ')}.`;
    }
    return null;
  });

  protected isDuplicateOrder(axis: string): boolean {
    const value = this.orderDrafts()[axis];
    return value !== null && value !== undefined && this.duplicateOrders().includes(value);
  }

  protected saveSettings(): void {
    if (this.orderError()) return;
    const order = [...this.sections()]
      .sort((a, b) => (this.orderDrafts()[a.axis] ?? 0) - (this.orderDrafts()[b.axis] ?? 0))
      .map((section) => section.axis);
    this.masterData.updateKitSettings(order, this.settingsDrafts());
    // Reload rather than just re-rendering: in real mode the save is fire-and-forget, so reloading
    // is what proves what came back from the backend is what got stored.
    this.toast.showAndReload('Kit settings saved — the survey now asks in this order too', 'success');
  }
}

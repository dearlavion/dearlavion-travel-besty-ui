import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MasterDataService, MasterDataType } from '../../common/master-data/master-data.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';
import { ToastService } from '../../common/toast/toast.service';

interface KitSettingsSection {
  axis: MasterDataType;
  title: string;
  description: string;
}

const PAGE_SIZE = 5;

// Per-axis metadata (title, description) — unordered. Display order is driven separately by
// masterData.typeOrder() (see the `sections` computed below), so the rows can be reordered via
// their Order inputs without touching this config.
const SECTION_CONFIG: KitSettingsSection[] = [
  {
    axis: 'destination',
    title: 'Destination',
    description: 'Where a trip is headed — powers the /travel survey and product tagging.',
  },
  {
    axis: 'season',
    title: 'Season',
    description: 'What the weather will be like — powers the /travel survey and product tagging.',
  },
  {
    axis: 'party',
    title: 'Party',
    description: 'Who is traveling — powers the /travel survey and product tagging.',
  },
  {
    axis: 'transportation',
    title: 'Transportation',
    description: 'How they are getting there — powers the /travel survey and product tagging.',
  },
  {
    axis: 'activity',
    title: 'Activities',
    description: 'What they will be doing — powers the /travel survey and product tagging.',
  },
  {
    axis: 'kitCategory',
    title: 'Kit Category',
    description: 'Packing-list buckets — powers the survey\'s "what matters most" question and product tagging.',
  },
  {
    axis: 'duration',
    title: 'Duration',
    description: 'Trip length bands — fixed at exactly 4, since the kit-sizing engine keys off them directly.',
  },
  {
    axis: 'gender',
    title: 'Gender',
    description: 'Collected on the survey for sizing — not yet tied to product tagging.',
  },
];

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
  protected readonly sections = computed<KitSettingsSection[]>(() => {
    const order = this.masterData.typeOrder();
    const byAxis = new Map(SECTION_CONFIG.map((s) => [s.axis, s]));
    const ordered = order.map((axis) => byAxis.get(axis as MasterDataType)).filter((s): s is KitSettingsSection => !!s);
    const seen = new Set(ordered.map((s) => s.axis));
    return [...ordered, ...SECTION_CONFIG.filter((s) => !seen.has(s.axis))];
  });

  protected valueCount(axis: MasterDataType): number {
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

  // Once the admin touches any input, stop re-seeding drafts from typeOrder() — otherwise real
  // mode's async /type-order response (or the post-save signal update) would wipe their edits.
  private readonly orderEdited = signal(false);

  constructor() {
    effect(() => {
      const sections = this.sections();
      const order = this.masterData.typeOrder();
      if (this.orderEdited()) return;
      const drafts: Record<string, number | null> = {};
      sections.forEach((section, i) => {
        const at = order.indexOf(section.axis);
        drafts[section.axis] = (at === -1 ? i : at) + 1;
      });
      this.orderDrafts.set(drafts);
    });
  }

  protected orderDraftFor(axis: MasterDataType): number | null {
    return this.orderDrafts()[axis] ?? null;
  }

  protected setOrderDraft(axis: MasterDataType, value: unknown): void {
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

  protected isDuplicateOrder(axis: MasterDataType): boolean {
    const value = this.orderDrafts()[axis];
    return value !== null && value !== undefined && this.duplicateOrders().includes(value);
  }

  protected saveOrder(): void {
    if (this.orderError()) return;
    const order = [...this.sections()]
      .sort((a, b) => (this.orderDrafts()[a.axis] ?? 0) - (this.orderDrafts()[b.axis] ?? 0))
      .map((section) => section.axis);
    this.masterData.updateTypeOrder(order);
    // Reload rather than just re-rendering: in real mode updateTypeOrder() is fire-and-forget, so
    // reloading is what proves the saved order actually came back from the backend.
    this.toast.showAndReload('Section order updated — the survey now asks in this order too', 'success');
  }
}

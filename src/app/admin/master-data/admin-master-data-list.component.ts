import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  deriveCollectionKey,
  MasterDataCollection,
  MasterDataService,
} from '../../common/master-data/master-data.service';
import { ToastService } from '../../common/toast/toast.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';

interface CollectionRow extends MasterDataCollection {
  count: number;
  /** First few values, joined — enough to recognise the collection without opening it. */
  preview: string;
}

const PAGE_SIZE = 10;
const PREVIEW_COUNT = 4;

// Browser over the 8 master-data collections (MasterDataService's cached values) — the index half
// of /admin/master-data; clicking a row opens AdminMasterDataDetailComponent for that one
// collection, whose rows in turn link to AdminMasterDataFormComponent for per-value CRUD. Kit
// Settings (/admin/kit-settings) edits the same data in its inline all-collections-at-once view;
// both write through MasterDataService, so they stay in sync.
@Component({
  selector: 'app-admin-master-data-list',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './admin-master-data-list.component.html',
  styleUrl: './admin-master-data.component.css',
})
export class AdminMasterDataListComponent {
  private readonly masterData = inject(MasterDataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed

  // Collections render in the admin-configured type order (same order Kit Settings and the /travel
  // survey use), with any collection typeOrder() hasn't caught up to appended — mirrors
  // AdminKitSettingsComponent.sections().
  protected readonly rows = computed<CollectionRow[]>(() => {
    const order = this.masterData.typeOrder();
    const registry = this.masterData.collections();
    const byKey = new Map(registry.map((c) => [c.key, c]));
    const ordered = order.map((key) => byKey.get(key)).filter((c): c is MasterDataCollection => !!c);
    const seen = new Set(ordered.map((c) => c.key));
    // Admin-created collections aren't in typeOrder until someone puts them there, so they land
    // here — appended after the ordered ones rather than dropped.
    const all = [...ordered, ...registry.filter((c) => !seen.has(c.key))];

    return all.map((collection) => {
      const values = this.masterData.forType(collection.key);
      return {
        ...collection,
        count: values.length,
        preview: values
          .slice(0, PREVIEW_COUNT)
          .map((v) => v.value)
          .join(', '),
      };
    });
  });

  protected readonly totalValues = computed(() => this.rows().reduce((sum, r) => sum + r.count, 0));

  protected readonly filtered = computed<CollectionRow[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter(
      (r) =>
        r.label.toLowerCase().includes(term) ||
        r.key.toLowerCase().includes(term) ||
        r.preview.toLowerCase().includes(term),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedRows = computed<CollectionRow[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  // ── New collection ────────────────────────────────────────────────────────────────────────────
  protected readonly creating = signal(false);
  protected readonly newLabel = signal('');

  /** Previews the key the backend will derive, so the admin sees the URL segment before saving. */
  protected readonly newKey = computed(() => deriveCollectionKey(this.newLabel()));

  protected readonly newLabelError = computed<string | null>(() => {
    const label = this.newLabel().trim();
    if (!label) return null; // nothing typed yet — not an error, just an inactive Create button
    if (!this.newKey()) return 'Use at least one letter or number.';
    if (this.rows().some((r) => r.key === this.newKey())) return `A collection with key "${this.newKey()}" already exists.`;
    return null;
  });

  protected startCreating(): void {
    this.creating.set(true);
    this.newLabel.set('');
  }

  protected cancelCreating(): void {
    this.creating.set(false);
    this.newLabel.set('');
  }

  protected createCollection(): void {
    const label = this.newLabel().trim();
    if (!label || this.newLabelError()) return;
    this.masterData.createCollection(label, (created) => {
      this.creating.set(false);
      this.newLabel.set('');
      this.toast.success(`Created "${created.label}" — add its values next`);
      this.router.navigate(['/admin/master-data', created.key]);
    });
  }

  // ── Delete (custom collections only — built-ins are refused by the backend) ────────────────────
  protected readonly confirmingDeleteKey = signal<string | null>(null);

  protected requestDelete(key: string): void {
    this.confirmingDeleteKey.set(key);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteKey.set(null);
  }

  protected confirmDelete(row: CollectionRow): void {
    this.masterData.deleteCollection(row.key);
    this.confirmingDeleteKey.set(null);
    this.toast.success(`Deleted "${row.label}"`);
  }
}

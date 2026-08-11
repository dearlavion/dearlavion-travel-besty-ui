import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MASTER_DATA_COLLECTIONS,
  MasterDataCollection,
  MasterDataService,
} from '../../common/master-data/master-data.service';
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

  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed

  // Collections render in the admin-configured type order (same order Kit Settings and the /travel
  // survey use), with any collection typeOrder() hasn't caught up to appended — mirrors
  // AdminKitSettingsComponent.sections().
  protected readonly rows = computed<CollectionRow[]>(() => {
    const order = this.masterData.typeOrder();
    const byKey = new Map(MASTER_DATA_COLLECTIONS.map((c) => [c.key, c]));
    const ordered = order.map((key) => byKey.get(key)).filter((c): c is MasterDataCollection => !!c);
    const seen = new Set(ordered.map((c) => c.key));
    const all = [...ordered, ...MASTER_DATA_COLLECTIONS.filter((c) => !seen.has(c.key))];

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
}

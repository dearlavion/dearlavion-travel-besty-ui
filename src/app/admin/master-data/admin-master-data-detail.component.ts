import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  MASTER_DATA_COLLECTIONS,
  MasterDataService,
  MasterDataValue,
} from '../../common/master-data/master-data.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';
import { FIXED_CARDINALITY_TYPES } from './fixed-cardinality-types';

const PAGE_SIZE = 10;

// One master-data collection's rows, opened from AdminMasterDataListComponent. Each value links to
// AdminMasterDataFormComponent for edit/delete; "+ Add Value" opens the same form in add mode.
@Component({
  selector: 'app-admin-master-data-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './admin-master-data-detail.component.html',
  styleUrl: './admin-master-data.component.css',
})
export class AdminMasterDataDetailComponent {
  private readonly masterData = inject(MasterDataService);

  private readonly key = inject(ActivatedRoute).snapshot.paramMap.get('key') ?? '';

  // Null for an unknown/mistyped :key — the template renders a not-found note instead of a table.
  protected readonly collection = MASTER_DATA_COLLECTIONS.find((c) => c.key === this.key) ?? null;

  // Duration's row count is fixed — no "+ Add Value" there (see FIXED_CARDINALITY_TYPES).
  protected readonly allowAdd = !FIXED_CARDINALITY_TYPES.has(this.key);

  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed

  protected readonly rows = computed<MasterDataValue[]>(() =>
    this.collection ? this.masterData.forType(this.collection.key) : [],
  );

  // Only duration carries a `code` today — hide the column entirely for the other 7 collections
  // rather than render a full column of dashes.
  protected readonly showCode = computed(() => this.rows().some((r) => !!r.code));
  protected readonly showEmoji = computed(() => this.rows().some((r) => !!r.emoji));
  protected readonly showSubtext = computed(() => this.rows().some((r) => !!r.subtext));

  protected readonly columnCount = computed(
    () => 3 + (this.showEmoji() ? 1 : 0) + (this.showSubtext() ? 1 : 0) + (this.showCode() ? 1 : 0),
  );

  protected readonly filtered = computed<MasterDataValue[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter(
      (r) =>
        r.value.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        (r.subtext ?? '').toLowerCase().includes(term) ||
        (r.code ?? '').toLowerCase().includes(term),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedRows = computed<MasterDataValue[]>(() => {
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

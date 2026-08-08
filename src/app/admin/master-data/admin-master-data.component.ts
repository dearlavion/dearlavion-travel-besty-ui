import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../common/pagination/pagination.component';
import { MASTER_DATA_COLLECTIONS, MasterDataService } from './master-data.service';

const PAGE_SIZE = 10;

interface CollectionRow {
  key: string;
  label: string;
  path: string;
  // null while its count request is in flight.
  count: number | null;
}

@Component({
  selector: 'app-admin-master-data',
  standalone: true,
  imports: [RouterLink, PaginationComponent],
  templateUrl: './admin-master-data.component.html',
  styleUrl: './admin-master-data.component.css',
})
export class AdminMasterDataComponent {
  private readonly masterData = inject(MasterDataService);

  protected readonly rows = signal<CollectionRow[]>(MASTER_DATA_COLLECTIONS.map((c) => ({ ...c, count: null })));
  protected readonly page = signal(0);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));
  protected readonly pagedRows = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.rows().slice(start, start + PAGE_SIZE);
  });

  constructor() {
    for (const collection of MASTER_DATA_COLLECTIONS) {
      this.masterData.getItems(collection.path).subscribe({
        next: (items) => this.setCount(collection.key, items.length),
        error: () => this.setCount(collection.key, 0),
      });
    }
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  private setCount(key: string, count: number): void {
    this.rows.update((rows) => rows.map((r) => (r.key === key ? { ...r, count } : r)));
  }
}

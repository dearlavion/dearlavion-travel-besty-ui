import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaginationComponent } from '../../common/pagination/pagination.component';
import { MASTER_DATA_COLLECTIONS, MasterDataItem, MasterDataService } from './master-data.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-admin-master-data-collection',
  standalone: true,
  imports: [RouterLink, PaginationComponent],
  templateUrl: './admin-master-data-collection.component.html',
  styleUrl: './admin-master-data-collection.component.css',
})
export class AdminMasterDataCollectionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly masterData = inject(MasterDataService);

  protected readonly collectionPath = signal(this.route.snapshot.paramMap.get('collection') ?? '');
  protected readonly collectionLabel = computed(
    () => MASTER_DATA_COLLECTIONS.find((c) => c.path === this.collectionPath())?.label ?? this.collectionPath(),
  );
  // Only the duration collection carries a stable `code` (day/short/medium/long) — see
  // dearlavion-spring-master-data-service's Duration.java.
  protected readonly hasCode = computed(() => this.collectionPath() === 'durations');

  protected readonly items = signal<MasterDataItem[]>([]);
  protected readonly loaded = signal(false);
  protected readonly page = signal(0);

  protected readonly sortedItems = computed(() => [...this.items()].sort((a, b) => a.order - b.order));
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedItems().length / PAGE_SIZE)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));
  protected readonly pagedItems = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.sortedItems().slice(start, start + PAGE_SIZE);
  });

  constructor() {
    this.masterData.getItems(this.collectionPath()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductItemService, ProductItemView } from '../../shop/product-item.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';

type InventoryFilter = 'all' | 'low' | 'sold-out';

// Items at or below this stock count (and not already sold out) get flagged as "low stock".
const LOW_STOCK_THRESHOLD = 5;
const PAGE_SIZE = 20;

// Stock/soldOut now live on ProductItem, not Product — this page tracks purchasable items
// (`views()`, same active catalog Shop renders), not generic products. An item deactivated via
// the per-product CRUD on the edit page (task 99) simply drops off this list, same as Shop.
@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent],
  templateUrl: './admin-inventory.component.html',
  styleUrl: './admin-inventory.component.css',
})
export class AdminInventoryComponent {
  protected readonly productItems = inject(ProductItemService);
  protected readonly filter = signal<InventoryFilter>('all');
  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed
  protected readonly lowStockThreshold = LOW_STOCK_THRESHOLD;

  protected readonly stats = computed(() => {
    const list = this.productItems.views();
    const soldOut = list.filter((p) => p.soldOut).length;
    const lowStock = list.filter((p) => !p.soldOut && p.stock <= LOW_STOCK_THRESHOLD).length;
    return {
      total: list.length,
      inStock: list.length - soldOut - lowStock,
      lowStock,
      soldOut,
    };
  });

  // Filter- and search-matched — the full result set before pagination slices it, so page-count
  // math reads off this rather than the visible page alone.
  protected readonly filtered = computed(() => {
    const list = this.productItems.views();
    const f = this.filter();
    const term = this.search().trim().toLowerCase();
    let result = list;
    if (f === 'low') result = result.filter((p) => !p.soldOut && p.stock <= LOW_STOCK_THRESHOLD);
    else if (f === 'sold-out') result = result.filter((p) => p.soldOut);
    if (term) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          (p.brand ?? '').toLowerCase().includes(term),
      );
    }
    return result;
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  // Clamps in the same read — switching filters/search out from under a page falls back to the
  // new last page instead of showing a blank table.
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedItems = computed<ProductItemView[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected setFilter(f: InventoryFilter): void {
    this.filter.set(f);
    this.page.set(0); // a new filter invalidates whatever page the admin was on
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0); // a new search invalidates whatever page the admin was on
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected isLowStock(stock: number, soldOut: boolean): boolean {
    return !soldOut && stock <= LOW_STOCK_THRESHOLD;
  }

  protected setStock(id: string, value: string): void {
    const stock = Math.max(0, Number(value) || 0);
    this.productItems.updateItem(id, { stock });
  }

  protected toggleSoldOut(id: string, soldOut: boolean): void {
    this.productItems.updateItem(id, { soldOut });
  }
}

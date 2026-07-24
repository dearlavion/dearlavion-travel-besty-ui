import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../shop/product-catalog';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { ProductItemService, ProductItemView } from '../../shop/product-item.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';

// A generic Product paired with its default (cheapest active) ProductItem, purely for this
// table's Price/Stock convenience columns — editing them here edits that one default item, same
// as the inline item CRUD on the edit page (task 99). A product with real brand variants shows
// its cheapest one; manage the rest from Edit.
interface ProductRow {
  product: Product;
  defaultItem: ProductItemView | undefined;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink, PaginationComponent],
  templateUrl: './admin-product-list.component.html',
  styleUrl: './admin-product-list.component.css',
})
export class AdminProductListComponent {
  protected readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);

  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed
  protected readonly confirmingDeleteId = signal<string | null>(null);

  constructor() {
    // Cross-catalog view — reads catalog.products() directly, so it needs the full list.
    this.catalog.ensureAllLoaded();
  }

  // Search-matched, sorted A→Z by name — the full result set before pagination slices it, so
  // "X of Y" counts and page-count math both read off this rather than the visible page alone.
  protected readonly filtered = computed<Product[]>(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.catalog.products();
    const matched = !term
      ? list
      : list.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            p.id.toLowerCase().includes(term),
        );
    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  // Clamps in the same read — if a search/delete shrinks the result set out from under a page the
  // admin was already on, this falls back to the new last page instead of showing a blank table.
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedProducts = computed<Product[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected readonly rows = computed<ProductRow[]>(() =>
    this.pagedProducts().map((product) => ({ product, defaultItem: this.productItems.getDefault(product.id) })),
  );

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0); // a new search invalidates whatever page the admin was on
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected setStock(itemId: string, value: string): void {
    const stock = Math.max(0, Number(value) || 0);
    this.productItems.updateItem(itemId, { stock });
  }

  protected toggleSoldOut(itemId: string, soldOut: boolean): void {
    this.productItems.updateItem(itemId, { soldOut });
  }

  protected toggleActive(id: string, active: boolean): void {
    this.catalog.updateProduct(id, { active });
  }

  protected requestDelete(id: string): void {
    this.confirmingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(id: string): void {
    this.catalog.deleteProduct(id);
    this.confirmingDeleteId.set(null);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../shop/product-catalog';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { ProductItemService, ProductItemView } from '../../shop/product-item.service';

// A generic Product paired with its default (cheapest active) ProductItem, purely for this
// table's Price/Stock convenience columns — editing them here edits that one default item, same
// as the inline item CRUD on the edit page (task 99). A product with real brand variants shows
// its cheapest one; manage the rest from Edit.
interface ProductRow {
  product: Product;
  defaultItem: ProductItemView | undefined;
}

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './admin-product-list.component.html',
  styleUrl: './admin-product-list.component.css',
})
export class AdminProductListComponent {
  protected readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);

  protected readonly search = signal('');
  protected readonly confirmingDeleteId = signal<string | null>(null);

  protected readonly filtered = computed<Product[]>(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.catalog.products();
    if (!term) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term),
    );
  });

  protected readonly rows = computed<ProductRow[]>(() =>
    this.filtered().map((product) => ({ product, defaultItem: this.productItems.getDefault(product.id) })),
  );

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

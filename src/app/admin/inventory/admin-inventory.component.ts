import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductCatalogService } from '../../shop/product-catalog.service';

type InventoryFilter = 'all' | 'low' | 'sold-out';

// Products at or below this stock count (and not already sold out) get flagged as "low stock".
const LOW_STOCK_THRESHOLD = 5;

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-inventory.component.html',
  styleUrl: './admin-inventory.component.css',
})
export class AdminInventoryComponent {
  protected readonly catalog = inject(ProductCatalogService);
  protected readonly filter = signal<InventoryFilter>('all');
  protected readonly lowStockThreshold = LOW_STOCK_THRESHOLD;

  protected readonly stats = computed(() => {
    const list = this.catalog.products();
    const soldOut = list.filter((p) => p.soldOut).length;
    const lowStock = list.filter((p) => !p.soldOut && p.stock <= LOW_STOCK_THRESHOLD).length;
    return {
      total: list.length,
      inStock: list.length - soldOut - lowStock,
      lowStock,
      soldOut,
    };
  });

  protected readonly filtered = computed(() => {
    const list = this.catalog.products();
    const f = this.filter();
    if (f === 'low') return list.filter((p) => !p.soldOut && p.stock <= LOW_STOCK_THRESHOLD);
    if (f === 'sold-out') return list.filter((p) => p.soldOut);
    return list;
  });

  protected isLowStock(stock: number, soldOut: boolean): boolean {
    return !soldOut && stock <= LOW_STOCK_THRESHOLD;
  }

  protected setStock(id: string, value: string): void {
    const stock = Math.max(0, Number(value) || 0);
    this.catalog.updateProduct(id, { stock });
  }

  protected toggleSoldOut(id: string, soldOut: boolean): void {
    this.catalog.updateProduct(id, { soldOut });
  }
}

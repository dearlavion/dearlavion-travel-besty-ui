import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductItemService } from '../../shop/product-item.service';

type InventoryFilter = 'all' | 'low' | 'sold-out';

// Items at or below this stock count (and not already sold out) get flagged as "low stock".
const LOW_STOCK_THRESHOLD = 5;

// Stock/soldOut now live on ProductItem, not Product — this page tracks purchasable items
// (`views()`, same active catalog Shop renders), not generic products. An item deactivated via
// the per-product CRUD on the edit page (task 99) simply drops off this list, same as Shop.
@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-inventory.component.html',
  styleUrl: './admin-inventory.component.css',
})
export class AdminInventoryComponent {
  protected readonly productItems = inject(ProductItemService);
  protected readonly filter = signal<InventoryFilter>('all');
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

  protected readonly filtered = computed(() => {
    const list = this.productItems.views();
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
    this.productItems.updateItem(id, { stock });
  }

  protected toggleSoldOut(id: string, soldOut: boolean): void {
    this.productItems.updateItem(id, { soldOut });
  }
}

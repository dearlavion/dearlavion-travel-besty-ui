import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ProductItemService } from '../../shop/product-item.service';
import { OrdersService } from '../../checkout/orders.service';
import { environment } from '../../../environments/environment';

export interface ProductItemStat {
  productItemId: string;
  productId: string;
  name: string;
  brand?: string;
  icon?: string;
  unitsSold: number;
  orderCount: number;
  revenue: number;
}

const STATS_BASE = `${environment.apiUrl}/admin/stats/product-items`;

/** Best/least performing product items, by units sold across placed orders. Real-backend mode
 * hits the admin aggregate endpoint (every order, every user). Mock mode has no shared backend to
 * aggregate across, so it approximates using this browser's own order history — same shape, same
 * UI, just scoped to whatever's in local storage rather than the whole store. */
@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private readonly http = inject(HttpClient);
  private readonly orders = inject(OrdersService);
  private readonly productItems = inject(ProductItemService);

  readonly stats = signal<ProductItemStat[]>([]);
  readonly loaded = signal(false);

  load(): void {
    if (environment.useMockData) {
      this.computeFromLocalOrders();
      return;
    }
    this.http.get<ProductItemStat[]>(STATS_BASE).subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  private computeFromLocalOrders(): void {
    const salesByItem = new Map<string, { unitsSold: number; orderCount: number; revenue: number }>();
    for (const order of this.orders.orders()) {
      for (const line of order.items) {
        const existing = salesByItem.get(line.productId) ?? { unitsSold: 0, orderCount: 0, revenue: 0 };
        existing.unitsSold += line.quantity;
        existing.orderCount += 1;
        existing.revenue += line.quantity * line.price;
        salesByItem.set(line.productId, existing);
      }
    }

    const result = this.productItems.views().map((item) => {
      const sales = salesByItem.get(item.id);
      return {
        productItemId: item.id,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        icon: item.icon,
        unitsSold: sales?.unitsSold ?? 0,
        orderCount: sales?.orderCount ?? 0,
        revenue: sales?.revenue ?? 0,
      };
    });
    result.sort((a, b) => b.unitsSold - a.unitsSold);
    this.stats.set(result);
    this.loaded.set(true);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ProductItemService } from '../shop/product-item.service';
import { OrdersService } from '../checkout/orders.service';
import { environment } from '../../environments/environment';

export interface TopSellingItem {
  productItemId: string;
  productId: string;
  name: string;
  brand?: string;
  icon?: string;
}

const STATS_BASE = `${environment.apiUrl}/stats/top-selling`;

/** The storefront's real best-sellers — backs the homepage "what's in my bag" widget. Real-backend
 * mode hits the public top-selling endpoint (every order, every user, no auth needed). Mock mode
 * has no shared backend to aggregate across, so it approximates using this browser's own order
 * history, padded out with the rest of the active catalog the same way the backend does. */
@Injectable({ providedIn: 'root' })
export class TopSellingService {
  private readonly http = inject(HttpClient);
  private readonly orders = inject(OrdersService);
  private readonly productItems = inject(ProductItemService);

  readonly items = signal<TopSellingItem[]>([]);

  load(limit: number): void {
    if (environment.useMockData) {
      this.computeFromLocalOrders(limit);
      return;
    }
    this.http.get<TopSellingItem[]>(STATS_BASE, { params: { limit } }).subscribe({
      next: (res) => this.items.set(res),
      error: () => this.items.set([]),
    });
  }

  private computeFromLocalOrders(limit: number): void {
    const unitsSoldByItem = new Map<string, number>();
    for (const order of this.orders.orders()) {
      for (const line of order.items) {
        unitsSoldByItem.set(line.productId, (unitsSoldByItem.get(line.productId) ?? 0) + line.quantity);
      }
    }

    const result = this.productItems
      .views()
      .map((item) => ({ item, unitsSold: unitsSoldByItem.get(item.id) ?? 0 }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit)
      .map(({ item }) => ({
        productItemId: item.id,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        icon: item.icon,
      }));
    this.items.set(result);
  }
}

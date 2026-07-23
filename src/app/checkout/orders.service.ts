import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

export interface OrderItem {
  productId: string;
  name: string;
  icon: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface Order {
  id: string; // e.g. TB-123456, same generated number shown on the confirmation screen
  placedAt: string; // ISO date
  items: OrderItem[];
  total: number;
  currency: string;
}

export type OrderStatus = 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered';

const STORAGE_KEY = 'travel-besty-orders';
const API_BASE = `${environment.apiUrl}/orders`;

const STATUS_STEPS: OrderStatus[] = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

// No real shipping carrier — status is a pure function of elapsed time since the order was
// placed, so a demo order visibly "progresses" the longer you leave it, without needing any
// stored/mutable status field. Thresholds are short (minutes, not days) so it's demoable. The
// backend's own order-status.util.ts ports this exact formula, so real-backend mode doesn't need
// to consume any server-computed status — this stays correct either way.
export function computeOrderStatus(placedAt: string): OrderStatus {
  const minutesElapsed = (Date.now() - new Date(placedAt).getTime()) / 60000;
  if (minutesElapsed < 1) return 'Processing';
  if (minutesElapsed < 3) return 'Shipped';
  if (minutesElapsed < 6) return 'Out for Delivery';
  return 'Delivered';
}

export function orderStatusStepIndex(status: OrderStatus): number {
  return STATUS_STEPS.indexOf(status);
}

export const ORDER_STATUS_STEPS = STATUS_STEPS;

// SSR prerenders routes and Node has no localStorage — every read/write must go through this
// guard (same pattern as CartService / SavedKitsService).
function loadStored(): Order[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

interface ApiOrder {
  id: string;
  reference: string;
  placedAt: string;
  items: OrderItem[];
  total: number;
  currency: string;
}

// The backend's own Mongo `id` is opaque; `reference` (e.g. "TB-123456") is the human-facing order
// number this app has always used as its `id` — map it through so nothing downstream (Track
// Packages, confirmation screen) needs to change.
function mapFromApi(raw: ApiOrder): Order {
  return { id: raw.reference, placedAt: raw.placedAt, items: raw.items, total: raw.total, currency: raw.currency };
}

/** Persists placed orders so /profile/track-packages can list them later — localStorage in mock
 * mode, the backend's `/orders` (auth-scoped) collection in real-backend mode. */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly orders = signal<Order[]>(environment.useMockData ? loadStored() : []);

  constructor() {
    // /orders is auth-guarded — skip the request when logged out (guaranteed 403 otherwise) and
    // always attach an error handler, since an unhandled subscribe error becomes an uncaught
    // exception rather than just a rejected promise.
    if (!environment.useMockData && this.auth.token()) {
      this.http.get<ApiOrder[]>(API_BASE).subscribe({
        next: (res) => this.orders.set(res.map(mapFromApi)),
        error: () => {},
      });
    }
  }

  addOrder(order: Order): void {
    if (!environment.useMockData) {
      this.orders.update((list) => [order, ...list]);
      this.http
        .post<ApiOrder>(API_BASE, {
          items: order.items,
          total: order.total,
          currency: order.currency,
          reference: order.id,
        })
        .subscribe({
          next: (created) => {
            const mapped = mapFromApi(created);
            this.orders.update((list) => list.map((o) => (o.id === order.id ? mapped : o)));
          },
          error: () => {},
        });
      return;
    }

    // Newest first.
    this.orders.update((list) => [order, ...list]);
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.orders()));
  }
}

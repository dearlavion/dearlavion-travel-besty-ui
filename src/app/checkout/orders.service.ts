import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

export interface OrderItem {
  productId: string; // generic Product (slug)
  productItemId?: string; // the specific ProductItem (SKU) purchased
  brand?: string;
  name: string;
  icon: string;
  quantity: number;
  price: number;
  currency: string;
  // Set once admin has manually decremented catalog stock for this line — see
  // OrdersService.markItemInventoryUpdated(). Absent on orders placed before this field existed.
  inventoryUpdated?: boolean;
}

export interface OrderShipping {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REJECTED';
export type OrderStatus = 'Processing' | 'Shipped' | 'Delivered';

export interface Order {
  id: string; // e.g. TB-123456, same generated number shown on the confirmation screen
  placedAt: string; // ISO date
  items: OrderItem[];
  shipping?: OrderShipping; // absent only for orders placed before this field existed
  total: number; // base (USD) catalog total, including shipping
  shippingFee?: number; // flat fee actually charged (0 if the order qualified for free shipping)
  currency: string;
  chargedAmount?: number; // total converted into the shopper's currency at checkout
  chargedCurrency?: string;
  paymentStatus: PaymentStatus;
  // Real, admin-controlled fulfillment state (set via /admin/orders actions) — not derived from
  // elapsed time. Defaults to 'Processing' server-side for every order, including legacy ones.
  deliveryStatus: OrderStatus;
  shippedAt?: string;
  deliveredAt?: string;
  // Admin-only visibility flag (see markArchived) — pulls an order out of the default admin view
  // without touching payment/delivery state. Absent/false for every normal order.
  archived?: boolean;
  archivedAt?: string;
}

const STORAGE_KEY = 'travel-besty-orders';
const API_BASE = `${environment.apiUrl}/orders`;
const ADMIN_API_BASE = `${environment.apiUrl}/admin/orders`;

export const ORDER_STATUS_STEPS: OrderStatus[] = ['Processing', 'Shipped', 'Delivered'];

export function orderStatusStepIndex(status: OrderStatus): number {
  return ORDER_STATUS_STEPS.indexOf(status);
}

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
  shipping?: OrderShipping;
  total: number;
  shippingFee?: number;
  currency: string;
  paymentStatus: PaymentStatus;
  deliveryStatus: OrderStatus;
  shippedAt?: string;
  deliveredAt?: string;
  archived?: boolean;
  archivedAt?: string;
}

// The backend's own Mongo `id` is opaque; `reference` (e.g. "TB-123456") is the human-facing order
// number this app has always used as its `id` — map it through so nothing downstream (Track
// Packages, confirmation screen) needs to change.
function mapFromApi(raw: ApiOrder): Order {
  return {
    id: raw.reference,
    placedAt: raw.placedAt,
    items: raw.items,
    shipping: raw.shipping,
    total: raw.total,
    shippingFee: raw.shippingFee,
    currency: raw.currency,
    paymentStatus: raw.paymentStatus,
    deliveryStatus: raw.deliveryStatus,
    shippedAt: raw.shippedAt,
    deliveredAt: raw.deliveredAt,
    archived: raw.archived,
    archivedAt: raw.archivedAt,
  };
}

/** Persists placed orders so /profile/track-packages can list them later — localStorage in mock
 * mode, the backend's `/orders` (auth-scoped) collection in real-backend mode. Also carries the
 * admin-facing fulfillment methods (list-all, mark shipped/delivered, flag inventory updated) —
 * mirrors how PaymentService mixes customer + admin methods in one class rather than splitting
 * them out. */
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
          shipping: order.shipping,
          total: order.total,
          shippingFee: order.shippingFee,
          currency: order.currency,
          reference: order.id,
          chargedAmount: order.chargedAmount,
          chargedCurrency: order.chargedCurrency,
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

  // ── Admin (fulfillment) — backs /admin/orders ───────────────────────────────────────────────
  // Mock mode has no multi-user data (one local stub identity), so "every order" is just this
  // identity's own `orders` signal, and the mutations below patch that same signal + persist().

  listAllForAdmin(filters?: { paymentStatus?: string; deliveryStatus?: string }): Observable<Order[]> {
    if (environment.useMockData) return of(this.orders());
    let params = new HttpParams();
    if (filters?.paymentStatus) params = params.set('paymentStatus', filters.paymentStatus);
    if (filters?.deliveryStatus) params = params.set('deliveryStatus', filters.deliveryStatus);
    return this.http.get<ApiOrder[]>(ADMIN_API_BASE, { params }).pipe(map((res) => res.map(mapFromApi)));
  }

  getForAdmin(idOrRef: string): Observable<Order | undefined> {
    if (environment.useMockData) return of(this.orders().find((o) => o.id === idOrRef));
    return this.http.get<ApiOrder>(`${ADMIN_API_BASE}/${idOrRef}`).pipe(map(mapFromApi));
  }

  markShipped(idOrRef: string): Observable<Order> {
    if (environment.useMockData) {
      return this.mockAdminUpdate(idOrRef, { deliveryStatus: 'Shipped', shippedAt: new Date().toISOString() });
    }
    return this.http.patch<ApiOrder>(`${ADMIN_API_BASE}/${idOrRef}/shipped`, {}).pipe(map(mapFromApi));
  }

  markDelivered(idOrRef: string): Observable<Order> {
    if (environment.useMockData) {
      return this.mockAdminUpdate(idOrRef, { deliveryStatus: 'Delivered', deliveredAt: new Date().toISOString() });
    }
    return this.http.patch<ApiOrder>(`${ADMIN_API_BASE}/${idOrRef}/delivered`, {}).pipe(map(mapFromApi));
  }

  archiveOrder(idOrRef: string): Observable<Order> {
    if (environment.useMockData) {
      return this.mockAdminUpdate(idOrRef, { archived: true, archivedAt: new Date().toISOString() });
    }
    return this.http.patch<ApiOrder>(`${ADMIN_API_BASE}/${idOrRef}/archive`, {}).pipe(map(mapFromApi));
  }

  unarchiveOrder(idOrRef: string): Observable<Order> {
    if (environment.useMockData) {
      return this.mockAdminUpdate(idOrRef, { archived: false, archivedAt: undefined });
    }
    return this.http.patch<ApiOrder>(`${ADMIN_API_BASE}/${idOrRef}/unarchive`, {}).pipe(map(mapFromApi));
  }

  markItemInventoryUpdated(idOrRef: string, productItemId: string): Observable<Order> {
    if (environment.useMockData) {
      const list = this.orders().map((o) =>
        o.id === idOrRef
          ? { ...o, items: o.items.map((i) => (i.productItemId === productItemId ? { ...i, inventoryUpdated: true } : i)) }
          : o,
      );
      this.orders.set(list);
      this.persist();
      return of(list.find((o) => o.id === idOrRef)!);
    }
    return this.http
      .patch<ApiOrder>(`${ADMIN_API_BASE}/${idOrRef}/items/${productItemId}/inventory-updated`, {})
      .pipe(map(mapFromApi));
  }

  private mockAdminUpdate(idOrRef: string, patch: Partial<Order>): Observable<Order> {
    const list = this.orders().map((o) => (o.id === idOrRef ? { ...o, ...patch } : o));
    this.orders.set(list);
    this.persist();
    return of(list.find((o) => o.id === idOrRef)!);
  }
}

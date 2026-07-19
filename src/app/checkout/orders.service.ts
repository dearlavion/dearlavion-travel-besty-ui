import { Injectable, signal } from '@angular/core';

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

const STATUS_STEPS: OrderStatus[] = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

// No real backend/shipping carrier — status is a pure function of elapsed time since the order
// was placed, so a demo order visibly "progresses" the longer you leave it, without needing any
// stored/mutable status field. Thresholds are short (minutes, not days) so it's demoable.
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

/** Persists placed orders to localStorage so /profile/track-packages can list them later. */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  readonly orders = signal<Order[]>(loadStored());

  addOrder(order: Order): void {
    // Newest first.
    this.orders.update((list) => [order, ...list]);
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.orders()));
  }
}

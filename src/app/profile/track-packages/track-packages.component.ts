import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PricePipe } from '../../common/price.pipe';
import { RouterLink } from '@angular/router';
import { Order, OrderStatus, OrdersService } from '../../checkout/orders.service';
import { PaymentService, PaymentStatus } from '../../payment/payment.service';

interface PaymentBadge {
  label: string;
  cssClass: string;
}

const PAYMENT_BADGES: Record<PaymentStatus, PaymentBadge> = {
  PENDING: { label: 'Verifying payment', cssClass: 'pay-pending' },
  APPROVED: { label: 'Paid', cssClass: 'pay-paid' },
  REJECTED: { label: 'Payment rejected', cssClass: 'pay-rejected' },
};

// Sort rank for the Payment column — awaiting < verifying < rejected < paid, cancelled last since
// it's a dead end regardless of what payment state it was in.
const PAYMENT_RANK: Record<string, number> = {
  awaiting: 0,
  PENDING: 1,
  REJECTED: 2,
  APPROVED: 3,
};

type StatusFilter = OrderStatus | 'all';

type SortKey = 'placed' | 'payment';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-track-packages',
  standalone: true,
  imports: [RouterLink, PricePipe, FormsModule],
  templateUrl: './track-packages.component.html',
  styleUrl: './track-packages.component.css',
})
export class TrackPackagesComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly paymentService = inject(PaymentService);

  protected readonly search = signal('');
  protected readonly sortKey = signal<SortKey>('placed');
  protected readonly sortDir = signal<SortDir>('desc');
  protected readonly filter = signal<StatusFilter>('all');

  protected readonly totalCount = computed(() => this.ordersService.orders().length);

  constructor() {
    // Ensure the caller's payments are loaded (the service may have been constructed while logged out).
    this.paymentService.refreshMine();
  }

  // Filter- and search-matched + sorted — newest-first by default (matches the original unsorted
  // list order), toggled by clicking the Payment/Placed column headers. A status filter
  // (Processing/Shipped/Delivered) excludes cancelled orders — cancelling doesn't change
  // deliveryStatus, so a cancelled order would otherwise still count under its old stage; "All"
  // is the only chip that shows them.
  protected readonly visibleOrders = computed<Order[]>(() => {
    const f = this.filter();
    const term = this.search().trim().toLowerCase();
    let result = this.ordersService.orders();
    if (f !== 'all') result = result.filter((o) => o.deliveryStatus === f && !o.cancelled);
    if (term) {
      result = result.filter(
        (o) => o.id.toLowerCase().includes(term) || o.items.some((i) => i.name.toLowerCase().includes(term)),
      );
    }

    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (key === 'payment') return (this.paymentRank(a) - this.paymentRank(b)) * dir;
      return (new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()) * dir;
    });
    return result;
  });

  protected setSearch(term: string): void {
    this.search.set(term);
  }

  protected setFilter(f: StatusFilter): void {
    this.filter.set(f);
  }

  /** Clicking an already-active column flips direction; switching columns starts descending. */
  protected setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
  }

  protected sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  private paymentRank(order: Order): number {
    if (order.cancelled) return 4;
    const payment = this.paymentService.forOrder(order.id);
    return PAYMENT_RANK[payment?.status ?? 'awaiting'];
  }

  /** Payment badge for an order — from its latest submitted payment, else "awaiting". */
  protected paymentBadge(order: Order): PaymentBadge {
    const payment = this.paymentService.forOrder(order.id);
    return payment ? PAYMENT_BADGES[payment.status] : { label: 'Awaiting payment', cssClass: 'pay-awaiting' };
  }

  /** Real, admin-set fulfillment status — the backend already guarantees this can't advance past
   * "Processing" before payment is approved (OrdersService.markShipped() requires PAID). */
  protected status(order: Order): OrderStatus {
    return order.deliveryStatus;
  }

  protected placedDateLabel(order: Order): string {
    return new Date(order.placedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected itemsSummary(order: Order): string {
    return order.items.map((i) => `${i.icon} ${i.name} × ${i.quantity}`).join(', ');
  }
}

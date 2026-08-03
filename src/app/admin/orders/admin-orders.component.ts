import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PricePipe } from '../../common/price.pipe';
import { Order, OrderStatus, OrdersService, PAYMENT_STATUS_LABEL, PaymentStatus } from '../../checkout/orders.service';
import { PaginationComponent } from '../../common/pagination/pagination.component';

type DeliveryFilter = OrderStatus | 'all' | 'Archived';
type PaymentFilter = PaymentStatus | 'all';

const PAGE_SIZE = 10;

const PAYMENT_FILTER_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'UNPAID', label: PAYMENT_STATUS_LABEL.UNPAID },
  { value: 'PENDING', label: PAYMENT_STATUS_LABEL.PENDING },
  { value: 'PAID', label: PAYMENT_STATUS_LABEL.PAID },
  { value: 'REJECTED', label: PAYMENT_STATUS_LABEL.REJECTED },
];

// Every order across every customer — the fulfillment queue admin works from once a payment is
// approved. Fetches the full list once and filters/paginates client-side (mirrors
// AdminInventoryComponent's fetch-all + client-filter idiom).
@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe, PaginationComponent],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css',
})
export class AdminOrdersComponent {
  private readonly ordersService = inject(OrdersService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly filter = signal<DeliveryFilter>('all');
  protected readonly paymentFilter = signal<PaymentFilter>('all');
  protected readonly paymentFilterOptions = PAYMENT_FILTER_OPTIONS;
  protected readonly search = signal('');
  protected readonly page = signal(0); // 0-indexed

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.ordersService.listAllForAdmin().subscribe({
      next: (res) => {
        this.orders.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  // Archived orders are excluded from every stat/count — they're pulled out of the default view
  // entirely, not just hidden behind the "All" chip.
  protected readonly counts = computed(() => {
    const list = this.orders().filter((o) => !o.archived);
    return {
      total: list.length,
      processing: list.filter((o) => o.deliveryStatus === 'Processing').length,
      shipped: list.filter((o) => o.deliveryStatus === 'Shipped').length,
      delivered: list.filter((o) => o.deliveryStatus === 'Delivered').length,
    };
  });

  // Filter- and search-matched — the full result set before pagination slices it, so "X of Y"
  // counts and page-count math both read off this rather than the visible page alone.
  protected readonly filtered = computed<Order[]>(() => {
    const f = this.filter();
    const pf = this.paymentFilter();
    const term = this.search().trim().toLowerCase();
    let result = this.orders();
    if (f === 'Archived') {
      result = result.filter((o) => o.archived);
    } else {
      result = result.filter((o) => !o.archived);
      if (f !== 'all') result = result.filter((o) => o.deliveryStatus === f);
    }
    if (pf !== 'all') result = result.filter((o) => o.paymentStatus === pf);
    if (term) {
      result = result.filter(
        (o) => o.id.toLowerCase().includes(term) || (o.shipping?.fullName ?? '').toLowerCase().includes(term),
      );
    }
    return result;
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedOrders = computed<Order[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected setFilter(f: DeliveryFilter): void {
    this.filter.set(f);
    this.page.set(0);
  }

  protected setPaymentFilter(f: PaymentFilter): void {
    this.paymentFilter.set(f);
    this.page.set(0);
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected paymentLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABEL[status];
  }

  protected itemsSummary(order: Order): string {
    return order.items.map((i) => `${i.icon} ${i.name} × ${i.quantity}`).join(', ');
  }

  protected placedDateLabel(order: Order): string {
    return new Date(order.placedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

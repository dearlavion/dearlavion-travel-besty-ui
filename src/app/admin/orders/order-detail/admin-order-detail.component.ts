import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PricePipe } from '../../../common/price.pipe';
import { Order, OrderItem, OrdersService, PAYMENT_STATUS_LABEL, PaymentStatus } from '../../../checkout/orders.service';
import { ProductItemService } from '../../../shop/product-item.service';
import { ToastService } from '../../../common/toast/toast.service';
import { Payment, PaymentMethod, PaymentService } from '../../../payment/payment.service';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  GCASH: 'GCash',
  MAYA: 'Maya',
  MARIBANK: 'Maribank',
  CARD: 'Card',
};

type PaymentReviewAction = 'approve' | 'reject';

// Single order, opened from AdminOrdersComponent's list. Fulfillment actions (mark shipped, mark
// delivered) require paymentStatus === 'PAID' — the backend enforces this too (409s otherwise),
// this UI just hides/disables what can't be done yet. Marking shipped now also decrements catalog
// stock for every line server-side (OrdersService.markShipped), so the per-item "Update Inventory"
// button below is a fallback for manual pre-shipment correction or per-item retry, not a required
// step — a normal ship leaves nothing for it to do.
@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [RouterLink, PricePipe, FormsModule],
  templateUrl: './admin-order-detail.component.html',
  styleUrl: './admin-order-detail.component.css',
})
export class AdminOrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  protected readonly productItems = inject(ProductItemService);
  private readonly toast = inject(ToastService);
  private readonly paymentService = inject(PaymentService);

  private readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly updatingInventoryFor = signal<string | null>(null);
  protected readonly submittingAction = signal(false);

  protected readonly methodLabels = METHOD_LABELS;
  protected readonly payment = signal<Payment | null>(null);
  protected readonly paymentLoading = signal(false);
  protected readonly paymentReviewAction = signal<PaymentReviewAction | null>(null);
  protected readonly paymentReviewNote = signal('');
  protected readonly submittingPaymentReview = signal(false);

  constructor() {
    // Cross-catalog lookup (per-line "current stock") — needs the full item list.
    this.productItems.ensureCatalogLoaded();
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.ordersService.getForAdmin(this.orderId).subscribe({
      next: (res) => {
        this.order.set(res ?? null);
        this.loading.set(false);
        if (!res) this.loadError.set(true);
        if (res?.paymentStatus === 'PENDING' && res.paymentId) this.loadPayment(res.paymentId);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadPayment(paymentId: string): void {
    this.paymentLoading.set(true);
    this.paymentService.getForAdmin(paymentId).subscribe({
      next: (res) => {
        this.payment.set(res);
        this.paymentLoading.set(false);
      },
      error: () => {
        this.payment.set(null);
        this.paymentLoading.set(false);
      },
    });
  }

  protected requestPaymentReview(action: PaymentReviewAction): void {
    this.paymentReviewAction.set(action);
    this.paymentReviewNote.set('');
  }

  protected cancelPaymentReview(): void {
    this.paymentReviewAction.set(null);
    this.paymentReviewNote.set('');
  }

  protected confirmPaymentReview(): void {
    const action = this.paymentReviewAction();
    const paymentId = this.payment()?.id;
    if (!action || !paymentId) return;
    this.submittingPaymentReview.set(true);
    const note = this.paymentReviewNote().trim() || undefined;
    const call = action === 'approve' ? this.paymentService.approve(paymentId, note) : this.paymentService.reject(paymentId, note);
    call.subscribe({
      next: () => {
        this.submittingPaymentReview.set(false);
        this.paymentReviewAction.set(null);
        this.toast.success(action === 'approve' ? 'Payment approved' : 'Payment rejected');
        this.refresh();
      },
      error: () => {
        this.submittingPaymentReview.set(false);
        this.toast.error('Failed to update payment');
      },
    });
  }

  protected readonly canMarkShipped = computed(() => {
    const o = this.order();
    return !!o && o.paymentStatus === 'PAID' && o.deliveryStatus === 'Processing';
  });

  protected readonly canMarkDelivered = computed(() => {
    const o = this.order();
    return !!o && o.deliveryStatus === 'Shipped';
  });

  protected paymentLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABEL[status];
  }

  protected currentStock(item: OrderItem): number | null {
    if (!item.productItemId) return null;
    return this.productItems.getById(item.productItemId)?.stock ?? null;
  }

  /** Decrements catalog stock by the ordered quantity (reusing the same
   * ProductItemService.updateItem() path AdminInventoryComponent's stock field already uses),
   * then flags this line as updated so the button can't be clicked twice. */
  protected updateInventory(item: OrderItem): void {
    if (!item.productItemId || item.inventoryUpdated) return;
    const current = this.productItems.getById(item.productItemId);
    if (!current) return;

    const newStock = Math.max(0, current.stock - item.quantity);
    this.productItems.updateItem(item.productItemId, { stock: newStock });

    this.updatingInventoryFor.set(item.productItemId);
    this.ordersService.markItemInventoryUpdated(this.orderId, item.productItemId).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.updatingInventoryFor.set(null);
        this.toast.success(`Stock updated for ${item.name}`);
      },
      error: () => {
        this.updatingInventoryFor.set(null);
        this.toast.error('Failed to record the inventory update');
      },
    });
  }

  protected markShipped(): void {
    this.submittingAction.set(true);
    this.ordersService.markShipped(this.orderId).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.submittingAction.set(false);
        this.toast.success('Order marked as shipped');
      },
      error: () => {
        this.submittingAction.set(false);
        this.toast.error('Failed to mark this order shipped');
      },
    });
  }

  protected markDelivered(): void {
    this.submittingAction.set(true);
    this.ordersService.markDelivered(this.orderId).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.submittingAction.set(false);
        this.toast.success('Order marked as delivered');
      },
      error: () => {
        this.submittingAction.set(false);
        this.toast.error('Failed to mark this order delivered');
      },
    });
  }

  protected toggleArchive(): void {
    const o = this.order();
    if (!o) return;
    this.submittingAction.set(true);
    const action = o.archived ? this.ordersService.unarchiveOrder(this.orderId) : this.ordersService.archiveOrder(this.orderId);
    action.subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.submittingAction.set(false);
        this.toast.success(updated.archived ? 'Order archived' : 'Order unarchived');
      },
      error: () => {
        this.submittingAction.set(false);
        this.toast.error(`Failed to ${o.archived ? 'unarchive' : 'archive'} this order`);
      },
    });
  }

  protected dateLabel(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

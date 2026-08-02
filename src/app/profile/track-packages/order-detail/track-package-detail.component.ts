import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PricePipe } from '../../../common/price.pipe';
import { ToastService } from '../../../common/toast/toast.service';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_STEPS,
  OrdersService,
  orderStatusStepIndex,
} from '../../../checkout/orders.service';
import { PaymentService, PaymentStatus } from '../../../payment/payment.service';

interface PaymentBadge {
  label: string;
  cssClass: string;
}

const PAYMENT_BADGES: Record<PaymentStatus, PaymentBadge> = {
  PENDING: { label: 'Verifying payment', cssClass: 'pay-pending' },
  APPROVED: { label: 'Paid', cssClass: 'pay-paid' },
  REJECTED: { label: 'Payment rejected', cssClass: 'pay-rejected' },
};

// Single order, opened from Track Packages. Adds the two self-service actions the list card
// doesn't have room for: submitting payment (if none has been sent yet) and cancelling (only
// while the order hasn't shipped) — mirrors AdminOrderDetailComponent's action-panel layout.
@Component({
  selector: 'app-track-package-detail',
  standalone: true,
  imports: [RouterLink, PricePipe],
  templateUrl: './track-package-detail.component.html',
  styleUrl: './track-package-detail.component.css',
})
export class TrackPackageDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly paymentService = inject(PaymentService);
  private readonly toast = inject(ToastService);

  private readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly statusSteps = ORDER_STATUS_STEPS;
  protected readonly order = computed(() => this.ordersService.orders().find((o) => o.id === this.orderId));
  protected readonly payment = computed(() => this.paymentService.forOrder(this.orderId));

  protected readonly confirmingCancel = signal(false);
  protected readonly cancelling = signal(false);

  constructor() {
    this.paymentService.refreshMine();
  }

  protected readonly paymentBadge = computed<PaymentBadge>(() => {
    const payment = this.payment();
    return payment ? PAYMENT_BADGES[payment.status] : { label: 'Awaiting payment', cssClass: 'pay-awaiting' };
  });

  protected readonly canAddPayment = computed(() => {
    const o = this.order();
    return !!o && !o.cancelled && !this.payment();
  });

  // Cancellation isn't self-service once money has actually moved (PENDING: a submission is
  // awaiting review; PAID: it's already been approved) — only UNPAID/REJECTED orders can be
  // cancelled instantly here, matching the backend's own OrdersService.cancelOrder guard.
  protected readonly canCancel = computed(() => {
    const o = this.order();
    return (
      !!o &&
      !o.cancelled &&
      o.deliveryStatus === 'Processing' &&
      o.paymentStatus !== 'PENDING' &&
      o.paymentStatus !== 'PAID'
    );
  });

  // Shown in place of the actions panel when Cancel Order isn't offered because of payment
  // state — explains why, rather than the panel just silently vanishing.
  protected readonly cancelBlockedNote = computed(() => {
    const o = this.order();
    if (!o || o.cancelled) return null;
    if (o.paymentStatus === 'PENDING') {
      return "Your payment is being verified — this order can no longer be cancelled while it's under review.";
    }
    if (o.paymentStatus === 'PAID') {
      return 'This order has already been paid. Email hello@travelbesty.com if you need to cancel it.';
    }
    return null;
  });

  protected status(order: Order): OrderStatus {
    return order.deliveryStatus;
  }

  protected stepIndex(order: Order): number {
    return orderStatusStepIndex(this.status(order));
  }

  protected placedDateLabel(order: Order): string {
    return new Date(order.placedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected requestCancel(): void {
    this.confirmingCancel.set(true);
  }

  protected dismissCancel(): void {
    this.confirmingCancel.set(false);
  }

  protected confirmCancel(): void {
    this.cancelling.set(true);
    this.ordersService.cancelOrder(this.orderId).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.confirmingCancel.set(false);
        this.toast.success('Order cancelled');
      },
      error: () => {
        this.cancelling.set(false);
        this.toast.error('Could not cancel this order');
      },
    });
  }
}

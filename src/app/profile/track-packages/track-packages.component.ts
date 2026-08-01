import { Component, inject } from '@angular/core';
import { PricePipe } from '../../common/price.pipe';
import { RouterLink } from '@angular/router';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_STEPS,
  OrdersService,
  orderStatusStepIndex,
} from '../../checkout/orders.service';
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

@Component({
  selector: 'app-track-packages',
  standalone: true,
  imports: [RouterLink, PricePipe],
  templateUrl: './track-packages.component.html',
  styleUrl: './track-packages.component.css',
})
export class TrackPackagesComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly paymentService = inject(PaymentService);

  protected readonly orders = this.ordersService.orders;
  protected readonly statusSteps = ORDER_STATUS_STEPS;

  constructor() {
    // Ensure the caller's payments are loaded (the service may have been constructed while logged out).
    this.paymentService.refreshMine();
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
}

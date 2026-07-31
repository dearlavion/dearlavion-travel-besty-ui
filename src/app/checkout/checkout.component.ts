import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PricePipe } from '../common/price.pipe';
import { ExchangeRateService } from '../common/exchange-rate.service';
import { CartService } from '../cart/cart.service';
import { ProfileService } from '../profile/profile.service';
import { PAYMENT_METHODS, PaymentMethod, PaymentService } from '../payment/payment.service';
import { Order, OrderItem, OrdersService } from './orders.service';
import { FreeShippingNoticeComponent } from '../common/free-shipping-notice/free-shipping-notice.component';

// Two steps: (1) place the order with shipping details, then (2) submit a manual proof of payment
// (method + amount + reference # + proof-image URL) which an employee later verifies. No card data
// is captured — the customer pays via GCash/Maya/bank and uploads a screenshot.
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe, FreeShippingNoticeComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);
  private readonly ordersService = inject(OrdersService);
  private readonly paymentService = inject(PaymentService);
  private readonly profile = inject(ProfileService);
  private readonly exchange = inject(ExchangeRateService);

  // shipping
  fullName = '';
  email = '';
  address = '';
  city = '';
  postalCode = '';

  // payment proof
  protected readonly methods = PAYMENT_METHODS;
  protected readonly method = signal<PaymentMethod>('GCASH');
  protected readonly amountPaid = signal<number>(0);
  referenceNumber = '';
  proofImageUrl = '';

  protected readonly step = signal<'details' | 'payment' | 'done'>('details');
  protected readonly submitting = signal(false);
  protected readonly payError = signal('');
  protected readonly orderNumber = signal<string | null>(null);
  private placedTotalUsd = 0;

  /** Currency + amount the shopper is expected to pay (their preferred currency). */
  protected readonly currency = computed(() => this.profile.currency());

  protected placeOrder(form: NgForm): void {
    if (!form.valid) return;
    this.submitting.set(true);
    // Grand total actually charged: items + shipping (0 once free shipping is unlocked).
    this.placedTotalUsd = this.cart.total();

    const generatedOrderNumber = `TB-${Math.floor(100000 + Math.random() * 900000)}`;
    // cart lines key off the ProductItem (SKU): `line.productId` is the ProductItem id, and
    // `line.product` is that item's view (with the generic `productId` + `brand`). Only the
    // checked-out (selected) lines go into the order — lines the shopper left unchecked stay in
    // the cart.
    const items: OrderItem[] = this.cart.selectedLines().map((line) => ({
      productId: line.product.productId,
      productItemId: line.productId,
      brand: line.product.brand,
      name: line.product.name,
      icon: line.product.icon,
      quantity: line.quantity,
      price: line.product.price,
      currency: line.product.currency,
    }));
    // What the shopper is asked to pay, in their currency (converted from the USD total).
    const converted = Math.round(this.placedTotalUsd * this.exchange.rateFor(this.currency()) * 100) / 100;
    const order: Order = {
      id: generatedOrderNumber,
      placedAt: new Date().toISOString(),
      items,
      total: this.placedTotalUsd,
      shippingFee: this.cart.shippingCost(),
      currency: items[0]?.currency ?? 'USD',
      chargedAmount: converted,
      chargedCurrency: this.currency(),
    };
    this.ordersService.addOrder(order);

    this.orderNumber.set(generatedOrderNumber);
    this.amountPaid.set(converted);
    // Only the items just ordered come out of the cart — anything left unchecked stays behind.
    this.cart.removeSelected();
    this.step.set('payment');
    this.submitting.set(false);
  }

  protected submitPayment(form: NgForm): void {
    if (!form.valid || !this.orderNumber()) return;
    this.submitting.set(true);
    this.payError.set('');
    this.paymentService
      .submit({
        orderId: this.orderNumber()!,
        method: this.method(),
        amount: Number(this.amountPaid()),
        currency: this.currency(),
        referenceNumber: this.referenceNumber,
        proofImageUrl: this.proofImageUrl,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.step.set('done');
        },
        error: () => {
          this.submitting.set(false);
          this.payError.set('Could not submit your payment. Check the details and try again.');
        },
      });
  }
}

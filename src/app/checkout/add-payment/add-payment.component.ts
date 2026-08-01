import { DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../common/toast/toast.service';
import { OrdersService } from '../orders.service';
import { PAYMENT_METHODS, PaymentMethod, PaymentService } from '../../payment/payment.service';

// Reached from Track Packages' "Add Payment" button — submits a manual proof of payment for an
// order that's already placed but still awaiting one (same fields/flow as CheckoutComponent's
// payment step, just entered from an existing order instead of right after placing it).
@Component({
  selector: 'app-add-payment',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, LowerCasePipe],
  templateUrl: './add-payment.component.html',
  styleUrl: './add-payment.component.css',
})
export class AddPaymentComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly paymentService = inject(PaymentService);
  private readonly toast = inject(ToastService);

  private readonly orderId = this.route.snapshot.paramMap.get('orderId') ?? '';

  protected readonly order = computed(() => this.ordersService.orders().find((o) => o.id === this.orderId));
  protected readonly existingPayment = computed(() => this.paymentService.forOrder(this.orderId));

  protected readonly methods = PAYMENT_METHODS;
  protected readonly method = signal<PaymentMethod>('GCASH');
  protected readonly amountPaid = signal<number>(0);
  referenceNumber = '';
  proofImageUrl = '';

  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly currency = computed(() => this.order()?.chargedCurrency ?? this.order()?.currency ?? 'USD');

  private prefilled = false;

  constructor() {
    // Prefill once the order resolves (orders() may still be loading on a fresh page load in
    // real-backend mode) — guarded to run only once so it doesn't clobber the shopper's edits on
    // later signal updates.
    effect(() => {
      const o = this.order();
      if (o && !this.prefilled) {
        this.amountPaid.set(o.chargedAmount ?? o.total);
        this.prefilled = true;
      }
    });
  }

  protected submit(form: NgForm): void {
    const o = this.order();
    if (!form.valid || !o) return;
    this.submitting.set(true);
    this.error.set('');
    this.paymentService
      .submit({
        orderId: o.id,
        method: this.method(),
        amount: Number(this.amountPaid()),
        currency: this.currency(),
        referenceNumber: this.referenceNumber,
        proofImageUrl: this.proofImageUrl,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('Payment submitted for verification');
          this.router.navigate(['/profile/orders', o.id]);
        },
        error: () => {
          this.submitting.set(false);
          this.error.set('Could not submit your payment. Check the details and try again.');
        },
      });
  }
}

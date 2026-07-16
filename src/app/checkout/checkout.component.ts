import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../cart/cart.service';

// No real backend/payment processor (per this project's mockup-data-only scope) — submit just
// simulates a short request, same "submitting signal + setTimeout" idiom LoginComponent uses.
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);

  fullName = '';
  email = '';
  address = '';
  city = '';
  postalCode = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvc = '';

  protected readonly submitting = signal(false);
  protected readonly orderNumber = signal<string | null>(null);

  protected placeOrder(form: NgForm): void {
    if (!form.valid) return;

    this.submitting.set(true);
    setTimeout(() => {
      const generatedOrderNumber = `TB-${Math.floor(100000 + Math.random() * 900000)}`;
      this.orderNumber.set(generatedOrderNumber);
      this.cart.clear();
      this.submitting.set(false);
    }, 700);
  }
}

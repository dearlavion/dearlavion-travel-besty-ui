import { Component, inject, signal } from '@angular/core';
import { PricePipe } from '../common/price.pipe';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../cart/cart.service';
import { Order, OrderItem, OrdersService } from './orders.service';

// No real backend/payment processor (per this project's mockup-data-only scope) — submit just
// simulates a short request, same "submitting signal + setTimeout" idiom LoginComponent uses.
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);
  private readonly ordersService = inject(OrdersService);

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

      const items: OrderItem[] = this.cart.lines().map((line) => ({
        productId: line.productId,
        name: line.product.name,
        icon: line.product.icon,
        quantity: line.quantity,
        price: line.product.price,
        currency: line.product.currency,
      }));
      const order: Order = {
        id: generatedOrderNumber,
        placedAt: new Date().toISOString(),
        items,
        total: this.cart.subtotal(),
        currency: items[0]?.currency ?? 'USD',
      };
      this.ordersService.addOrder(order);

      this.orderNumber.set(generatedOrderNumber);
      this.cart.clear();
      this.submitting.set(false);
    }, 700);
  }
}

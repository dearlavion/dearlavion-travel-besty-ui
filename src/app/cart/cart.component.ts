import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { getProductTint } from '../shop/product-catalog';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent {
  protected readonly cart = inject(CartService);
  protected readonly getProductTint = getProductTint;

  protected increment(productId: string, currentQuantity: number): void {
    this.cart.updateQuantity(productId, currentQuantity + 1);
  }

  protected decrement(productId: string, currentQuantity: number): void {
    this.cart.updateQuantity(productId, currentQuantity - 1);
  }
}

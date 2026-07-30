import { Component, inject } from '@angular/core';
import { CartService } from '../../cart/cart.service';
import { PricePipe } from '../price.pipe';

// Reads CartService directly rather than taking @Inputs — both Cart and Checkout already inject
// the same CartService singleton, so this stays in sync with either page with zero wiring.
// Renders nothing when the admin has free shipping disabled (threshold = 0).
@Component({
  selector: 'app-free-shipping-notice',
  standalone: true,
  imports: [PricePipe],
  templateUrl: './free-shipping-notice.component.html',
  styleUrl: './free-shipping-notice.component.css',
})
export class FreeShippingNoticeComponent {
  protected readonly cart = inject(CartService);
}

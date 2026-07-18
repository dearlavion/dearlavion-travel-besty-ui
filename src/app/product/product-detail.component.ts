import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product, getProductTint } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { CartService } from '../cart/cart.service';

// The reusable template for any single product — one route (`/product/:id`), the id decides
// what renders.
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(ProductCatalogService);
  private readonly cart = inject(CartService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly getProductTint = getProductTint;
  protected readonly added = signal(false);

  protected readonly product = computed<Product | undefined>(() => {
    const id = this.paramMap()?.get('id');
    const product = id ? this.catalog.getById(id) : undefined;
    // An inactive product is treated the same as a deleted one on the customer-facing page —
    // admins can still see/reactivate it via the catalog list, just not preview it live.
    return product?.active ? product : undefined;
  });

  protected readonly relatedProducts = computed<Product[]>(() => {
    const product = this.product();
    return product ? this.catalog.getRelated(product) : [];
  });

  protected addToCart(): void {
    const product = this.product();
    if (!product) return;

    this.cart.addItem(product.id);
    this.added.set(true);
    setTimeout(() => this.added.set(false), 2000);
  }
}

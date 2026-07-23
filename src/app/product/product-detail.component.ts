import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product, getProductTint } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { CartService } from '../cart/cart.service';

// The reusable template for any single product — one route (`/product/:id`), the id decides
// what renders. Shows the generic Product's display info (name/category/description/tags) plus a
// purchase widget backed by its ProductItem(s) — every product has at least one (see
// PRODUCT_ITEMS/backfill-product-items.ts), and a product with real brand variants shows a picker.
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
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly getProductTint = getProductTint;
  protected readonly added = signal(false);

  // Shop/My Kit link straight to a specific item (`/product/:id/items/:itemId`) so clicking a
  // card lands on that exact variant, not just the product's cheapest/default one. A chip click
  // within the page overrides it for the rest of the session.
  private readonly routeItemId = computed(() => this.paramMap()?.get('itemId') ?? null);
  private readonly userSelectedItemId = signal<string | null>(null);

  protected readonly product = computed<Product | undefined>(() => {
    const id = this.paramMap()?.get('id');
    const product = id ? this.catalog.getById(id) : undefined;
    // An inactive product is treated the same as a deleted one on the customer-facing page —
    // admins can still see/reactivate it via the catalog list, just not preview it live.
    return product?.active ? product : undefined;
  });

  // All purchasable variants for this product, cheapest first — usually just the one default item.
  protected readonly items = computed<ProductItemView[]>(() => {
    const product = this.product();
    return product ? this.productItems.getForProduct(product.id) : [];
  });

  // Whichever variant the shopper explicitly clicked this session, else whichever the link they
  // arrived on named, else the cheapest (default) one.
  protected readonly selectedItem = computed<ProductItemView | undefined>(() => {
    const items = this.items();
    const userChoice = this.userSelectedItemId();
    if (userChoice) {
      const found = items.find((i) => i.id === userChoice);
      if (found) return found;
    }
    const routeChoice = this.routeItemId();
    if (routeChoice) {
      const found = items.find((i) => i.id === routeChoice);
      if (found) return found;
    }
    return items[0];
  });

  protected readonly relatedProducts = computed<ProductItemView[]>(() => {
    const product = this.product();
    if (!product) return [];
    // Related suggestions are shown as purchasable cards, so resolve each related generic
    // product down to its own default item — full unification guarantees one exists.
    return this.catalog
      .getRelated(product)
      .map((p) => this.productItems.getDefault(p.id))
      .filter((item): item is ProductItemView => !!item);
  });

  protected selectItem(id: string): void {
    this.userSelectedItemId.set(id);
  }

  protected addToCart(): void {
    const item = this.selectedItem();
    if (!item) return;

    this.cart.addItem(item.id);
    this.added.set(true);
    setTimeout(() => this.added.set(false), 2000);
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { getProductTint } from '../shop/product-catalog';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { CartService } from '../cart/cart.service';

// The reusable template for any single product — one route (`/product/:id[/items/:itemId]`), the
// id(s) decide what renders. Everything the page shows (name/category/description/tags AND
// price/stock/brand) comes from ProductItemView — the public aggregate already joins in the
// parent Product's display fields and already excludes items whose parent product is inactive, so
// this component never needs a separate ProductCatalogService fetch.
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
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

  constructor() {
    // Targeted fetches (GET /product-items?productId=:id and ?id=:itemId), never the full
    // catalog — this page only ever needs one product's items, so it shouldn't pull all 500 just
    // to render one. Both fire in parallel; neither depends on the other resolving first.
    effect(() => {
      const id = this.paramMap()?.get('id');
      if (id) this.productItems.loadForProduct(id);
    });
    effect(() => {
      const itemId = this.routeItemId();
      if (itemId) this.productItems.loadItem(itemId);
    });
  }

  // All purchasable variants for this product, cheapest first — usually just the one default item.
  protected readonly items = computed<ProductItemView[]>(() => this.productItems.currentProductItems());

  // Whichever variant the shopper explicitly clicked this session (via the picker, which only
  // ever offers items already in `items()`), else the directly-fetched single item a Shop/My-Kit
  // link named, else whichever the sibling list resolves that id to (covers the moment before the
  // direct fetch resolves), else the cheapest (default) one.
  protected readonly selectedItem = computed<ProductItemView | undefined>(() => {
    const items = this.items();
    const userChoice = this.userSelectedItemId();
    if (userChoice) {
      const found = items.find((i) => i.id === userChoice);
      if (found) return found;
    }
    const routeChoice = this.routeItemId();
    if (routeChoice) {
      const direct = this.productItems.currentItem();
      if (direct?.id === routeChoice) return direct;
      const found = items.find((i) => i.id === routeChoice);
      if (found) return found;
    }
    return items[0];
  });

  // Sibling items under the same parent product (other brands/variants), excluding whichever one
  // is currently shown — e.g. viewing "Samsonite Passport Wallet" suggests the wallet's other
  // brand options, not unrelated products from the wider catalog.
  protected readonly relatedProducts = computed<ProductItemView[]>(() => {
    const current = this.selectedItem();
    return this.items().filter((i) => i.id !== current?.id);
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

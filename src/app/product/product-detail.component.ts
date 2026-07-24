import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { getProductTint } from '../shop/product-catalog';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { CartService } from '../cart/cart.service';

// The reusable template for any single product item — one route (`/product/:id/items/:itemId`,
// or bare `/product/:id` for the cheapest/default item), the id(s) decide what renders.
// Everything the page shows (name/category/description/tags AND price/stock/brand) comes from
// ProductItemView — the public aggregate already joins in the parent Product's display fields and
// already excludes items whose parent product is inactive, so this component never needs a
// separate ProductCatalogService fetch. No in-page variant switcher — a sibling brand/variant is a
// full navigation via "You might also like" instead.
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
  protected readonly quantity = signal(1);

  // Shop/My Kit link straight to a specific item (`/product/:id/items/:itemId`) so this page
  // shows that exact variant, not just the product's cheapest/default one.
  private readonly routeItemId = computed(() => this.paramMap()?.get('itemId') ?? null);

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

  // Every item under this product — used only to resolve a bare-route fallback and to build "You
  // might also like" below; there's no in-page picker anymore, so this never drives the page's
  // own displayed item once a specific one is named in the URL.
  protected readonly items = computed<ProductItemView[]>(() => this.productItems.currentProductItems());

  // The directly-fetched single item a Shop/My-Kit link named, else whichever the sibling list
  // resolves that id to (covers the moment before the direct fetch resolves), else the cheapest
  // (default) one for a bare /product/:id visit.
  protected readonly selectedItem = computed<ProductItemView | undefined>(() => {
    const routeChoice = this.routeItemId();
    if (routeChoice) {
      const direct = this.productItems.currentItem();
      if (direct?.id === routeChoice) return direct;
      const found = this.items().find((i) => i.id === routeChoice);
      if (found) return found;
    }
    return this.items()[0];
  });

  // Sibling items under the same parent product (other brands/variants), excluding whichever one
  // is currently shown — e.g. viewing "Samsonite Passport Wallet" suggests the wallet's other
  // brand options, not unrelated products from the wider catalog.
  protected readonly relatedProducts = computed<ProductItemView[]>(() => {
    const current = this.selectedItem();
    return this.items().filter((i) => i.id !== current?.id);
  });

  // Destination/season/party tags, minus the "applies to everything" placeholder value — showing
  // "All" three times over doesn't tell a shopper anything.
  protected readonly tags = computed<string[]>(() => {
    const item = this.selectedItem();
    if (!item) return [];
    const all: string[] = [...item.destinations, ...item.seasons, ...item.parties];
    return all.filter((tag) => tag !== 'All');
  });

  protected incrementQuantity(): void {
    const max = this.selectedItem()?.stock ?? 1;
    this.quantity.update((q) => Math.min(q + 1, Math.max(max, 1)));
  }

  protected decrementQuantity(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  protected addToCart(): void {
    const item = this.selectedItem();
    if (!item || item.soldOut) return;

    this.cart.addItem(item.id, this.quantity());
    this.added.set(true);
    this.quantity.set(1);
    setTimeout(() => this.added.set(false), 2000);
  }
}

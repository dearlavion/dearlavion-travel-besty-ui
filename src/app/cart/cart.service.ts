import { Injectable, computed, inject, signal } from '@angular/core';
import { Product } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';

const STORAGE_KEY = 'travel-besty-cart';

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CartDisplayLine extends CartLine {
  product: Product;
}

// SSR prerenders /shop and other routes touch this service transitively — Node has no
// localStorage, so every read/write must go through this guard (same pattern as
// ProductCatalogService).
function loadStoredLines(): CartLine[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CartLine[];
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(ProductCatalogService);

  private readonly items = signal<CartLine[]>(loadStoredLines() ?? []);

  // Drops lines whose product was deleted from the catalog — mirrors MyKitComponent's
  // existing pattern of degrading gracefully instead of crashing.
  readonly lines = computed<CartDisplayLine[]>(() =>
    this.items()
      .map((line) => ({ ...line, product: this.catalog.getById(line.productId) }))
      .filter((line): line is CartDisplayLine => !!line.product),
  );

  readonly itemCount = computed(() => this.items().reduce((n, line) => n + line.quantity, 0));

  readonly subtotal = computed(() =>
    this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );

  addItem(productId: string, quantity = 1): void {
    const product = this.catalog.getById(productId);
    if (!product || product.soldOut) return;

    const existing = this.items().find((line) => line.productId === productId);
    if (existing) {
      this.updateQuantity(productId, existing.quantity + quantity);
      return;
    }

    this.items.update((list) => [...list, { productId, quantity }]);
    this.persist();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this.items.update((list) =>
      list.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
    this.persist();
  }

  removeItem(productId: string): void {
    this.items.update((list) => list.filter((line) => line.productId !== productId));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
  }
}

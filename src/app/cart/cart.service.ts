import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'travel-besty-cart';
const API_BASE = `${environment.apiUrl}/cart`;

// `productId` here is a ProductItem id (a purchasable SKU), not a generic Product id — matches
// the real backend's cart, which resolved to ProductItemService the same way (see
// dearlavion-store-engine/src/cart/cart.service.ts).
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CartDisplayLine extends CartLine {
  product: ProductItemView;
}

interface ApiCartView {
  items: { productId: string; quantity: number }[];
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
  private readonly productItems = inject(ProductItemService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  // Kept as the single source of truth in both modes — real mode just re-syncs it from the
  // backend's response after every mutation (dropping the server's embedded `product`/`lineTotal`
  // since `lines`/`subtotal` below already re-derive those locally from ProductCatalogService).
  // This means `lines`/`itemCount`/`subtotal` need zero changes between modes.
  private readonly items = signal<CartLine[]>(environment.useMockData ? (loadStoredLines() ?? []) : []);

  constructor() {
    // /cart is auth-guarded — CartService is injected app-wide (e.g. the nav's cart badge), so
    // this constructor runs on every page in real-backend mode, logged in or not (including SSR,
    // which never has a token). Skip the request entirely when logged out rather than firing a
    // guaranteed 403, and always attach an error handler — an unhandled subscribe error becomes an
    // uncaught exception (crashes the SSR/dev-server process), not just a rejected promise.
    if (!environment.useMockData && this.auth.token()) {
      this.http.get<ApiCartView>(API_BASE).subscribe({
        next: (res) => this.applyServerView(res),
        error: () => {},
      });
    }
  }

  // Drops lines whose product was deleted from the catalog — mirrors MyKitComponent's
  // existing pattern of degrading gracefully instead of crashing.
  readonly lines = computed<CartDisplayLine[]>(() =>
    this.items()
      .map((line) => ({ ...line, product: this.productItems.getById(line.productId) }))
      .filter((line): line is CartDisplayLine => !!line.product),
  );

  readonly itemCount = computed(() => this.items().reduce((n, line) => n + line.quantity, 0));

  readonly subtotal = computed(() =>
    this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );

  addItem(productId: string, quantity = 1): void {
    const product = this.productItems.getById(productId);
    if (!product || product.soldOut) return;

    if (!environment.useMockData) {
      this.http
        .post<ApiCartView>(`${API_BASE}/items`, { productId, quantity })
        .subscribe({ next: (res) => this.applyServerView(res), error: () => {} });
      return;
    }

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

    if (!environment.useMockData) {
      this.http
        .put<ApiCartView>(`${API_BASE}/items/${productId}`, { quantity })
        .subscribe({ next: (res) => this.applyServerView(res), error: () => {} });
      return;
    }

    this.items.update((list) =>
      list.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
    this.persist();
  }

  removeItem(productId: string): void {
    if (!environment.useMockData) {
      this.http
        .delete<ApiCartView>(`${API_BASE}/items/${productId}`)
        .subscribe({ next: (res) => this.applyServerView(res), error: () => {} });
      return;
    }

    this.items.update((list) => list.filter((line) => line.productId !== productId));
    this.persist();
  }

  clear(): void {
    if (!environment.useMockData) {
      this.http.delete<ApiCartView>(API_BASE).subscribe({ next: (res) => this.applyServerView(res), error: () => {} });
      return;
    }

    this.items.set([]);
    this.persist();
  }

  private applyServerView(res: ApiCartView): void {
    this.items.set(res.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
  }
}

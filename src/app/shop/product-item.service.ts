import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  Product,
  ProductDestination,
  ProductItem,
  ProductParty,
  ProductSeason,
  PRODUCT_ITEMS,
} from './product-catalog';
import { ProductCatalogService } from './product-catalog.service';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'travel-besty-product-items';
// Real-backend mode: the same aggregate the backend exposes at GET /product-items — every active,
// purchasable item across the whole catalog, pre-joined with its parent Product's display/taxonomy
// fields. Mock mode reproduces the identical shape locally by joining PRODUCT_ITEMS with
// ProductCatalogService.products() below, so every consumer (Shop, Cart, Checkout, Orders, My Kit
// suggestions) can treat ProductItemView the same way in both modes.
// ProductItem's own top-level endpoints — fully separate from /products and /admin/products.
// `productId` is a query param (list) or body field (create) rather than a nested URL segment.
const PUBLIC_LIST_BASE = `${environment.apiUrl}/product-items`;
const ADMIN_BASE = `${environment.apiUrl}/admin/product-items`;

// Mock-mode item ids are a plain incrementing number (as a string) — "1", "2", ... — matching the
// seeded PRODUCT_ITEMS. Unlike Product's slugified name-based id, an item's id never reflects its
// brand, so renaming a brand later never implies the id should've changed too.
function nextItemId(existingItems: readonly ProductItem[]): string {
  const numericIds = existingItems.map((i) => Number(i.id)).filter((n) => Number.isInteger(n));
  const max = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  return String(max + 1);
}

// SSR prerenders /shop and Node has no localStorage — same guard as ProductCatalogService/CartService.
function loadStoredItems(): ProductItem[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProductItem[];
  } catch {
    return null;
  }
}

// The Shop-ready shape: a purchasable ProductItem flattened together with its parent Product's
// display/taxonomy fields — this, not Product, is what Shop/Cart/Checkout/Orders/My-Kit-suggestions
// render and reference. `id` here is the ProductItem's own id (what carts/orders key on).
export interface ProductItemView {
  id: string;
  productId: string;
  name: string;
  brand?: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  icon: string;
  stock: number;
  soldOut: boolean;
  active: boolean;
  popular: boolean;
  tested: boolean;
  destinations: ProductDestination[];
  seasons: ProductSeason[];
  parties: ProductParty[];
}

interface ProductItemListResponse {
  content: ProductItemView[];
  page: number;
  size: number;
  total: number;
}

function toView(item: ProductItem, product: Product): ProductItemView {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    category: product.category,
    description: product.description,
    price: item.price,
    currency: item.currency,
    image: item.image,
    icon: item.icon ?? product.icon,
    stock: item.stock,
    soldOut: item.soldOut,
    active: item.active,
    popular: product.popular,
    tested: product.tested,
    destinations: product.destinations,
    seasons: product.seasons,
    parties: product.parties,
  };
}

@Injectable({ providedIn: 'root' })
export class ProductItemService {
  private readonly http = inject(HttpClient);
  // Only needed for mock mode's local join (see `views` below) — real mode's /product-items
  // already comes pre-joined from the backend, so injecting this unconditionally would construct
  // ProductCatalogService (and fire its own GET /products) purely as a side effect, even on pages
  // like /shop that only ever need items, not generic products.
  private readonly catalog = environment.useMockData ? inject(ProductCatalogService) : null;

  // Mock mode only — the raw, localStorage-backed items admin CRUD (task 99) edits directly.
  // Real mode's admin mutations go straight to the backend; `views` is refetched afterward instead.
  private readonly rawItems = signal<ProductItem[]>(loadStoredItems() ?? PRODUCT_ITEMS);

  private readonly fetchedViews = signal<ProductItemView[]>([]);

  // Mock: reactively re-joins whenever admin edits either a Product or a ProductItem, so the Shop
  // grid never goes stale. Real: a plain fetched signal, refreshed after admin mutations.
  readonly views: Signal<ProductItemView[]> = environment.useMockData
    ? computed(() => {
        const products = new Map(this.catalog!.products().map((p) => [p.id, p] as const));
        return this.rawItems()
          .filter((item) => item.active)
          .map((item) => {
            const product = products.get(item.productId);
            return product && product.active ? toView(item, product) : null;
          })
          .filter((v): v is ProductItemView => !!v);
      })
    : this.fetchedViews;

  // 'idle': never fetched. 'loading'/'loaded': fetch in flight or done — either way, don't fetch
  // again. Mock mode has nothing to fetch, so it starts (and stays) 'loaded'.
  private catalogState: 'idle' | 'loading' | 'loaded' = environment.useMockData ? 'loaded' : 'idle';

  // Lazily fetches the full catalog the first time something actually needs cross-product lookups
  // (Shop's listing/search, Admin Inventory, or Cart/My-Kit-suggestions resolving an id they don't
  // already have). A single-item page doesn't need this at all — see loadForProduct() below,
  // which is what /product/:id/items/:itemId uses instead.
  ensureCatalogLoaded(): void {
    if (this.catalogState !== 'idle') return;
    this.catalogState = 'loading';
    this.refetchViews();
  }

  // Forces a fresh full-catalog fetch regardless of current state — used after admin mutations
  // (create/update) so `views` reflects the change. Sets 'loading' up front so a concurrent
  // ensureCatalogLoaded() call doesn't kick off a second, redundant fetch.
  private refetchViews(): void {
    this.catalogState = 'loading';
    this.http
      .get<ProductItemListResponse>(PUBLIC_LIST_BASE, { params: { size: 500 } })
      .subscribe({
        next: (res) => {
          this.fetchedViews.set(res.content);
          this.catalogState = 'loaded';
        },
        error: () => {
          this.catalogState = 'loaded';
        },
      });
  }

  // The exact item a /product/:id/items/:itemId link named, fetched with a `?id=` filter — the
  // fastest, most minimal way to load what's actually being shown (name/price/brand render off
  // this directly, without waiting for the sibling list below).
  readonly currentItem = signal<ProductItemView | undefined>(undefined);

  loadItem(itemId: string): void {
    if (environment.useMockData) {
      this.currentItem.set(this.getById(itemId));
      return;
    }
    this.currentItem.set(undefined);
    this.http
      .get<ProductItemListResponse>(PUBLIC_LIST_BASE, { params: { id: itemId } })
      .subscribe({
        next: (res) => this.currentItem.set(res.content[0]),
        error: () => this.currentItem.set(undefined),
      });
  }

  // One product's active items, freshly fetched with a `?productId=` filter on the same public
  // aggregate — already pre-joined with the parent Product's display fields, so no client-side
  // join needed — rather than filtered out of the full catalog. Feeds the variant picker and the
  // "you might also like" siblings section; loads in parallel with loadItem() above rather than
  // gating the primary content on it.
  readonly currentProductItems = signal<ProductItemView[]>([]);

  loadForProduct(productId: string): void {
    if (environment.useMockData) {
      this.currentProductItems.set(this.getForProduct(productId));
      return;
    }
    this.currentProductItems.set([]);
    this.http
      .get<ProductItemListResponse>(PUBLIC_LIST_BASE, { params: { productId, size: 100 } })
      .subscribe({
        next: (res) => this.currentProductItems.set([...res.content].sort((a, b) => a.price - b.price)),
        error: () => this.currentProductItems.set([]),
      });
  }

  getById(id: string): ProductItemView | undefined {
    this.ensureCatalogLoaded();
    return this.views().find((v) => v.id === id);
  }

  // Every active item for one product, cheapest first, filtered out of the already-loaded full
  // catalog — used by Cart/My-Kit-suggestions/Admin (which need to resolve arbitrary products) and
  // by getDefault() below. ProductDetailComponent uses loadForProduct()/currentProductItems
  // instead so it doesn't trigger the full-catalog load this depends on.
  getForProduct(productId: string): ProductItemView[] {
    this.ensureCatalogLoaded();
    return this.views()
      .filter((v) => v.productId === productId)
      .sort((a, b) => a.price - b.price);
  }

  // The cheapest active item for a product — resolves a generic Product reference (My Kit
  // suggestions, getRelated(), a bare /product/:id page with no variant chosen) down to something
  // actually sellable, mirroring the backend's ProductItemService.getDefault().
  getDefault(productId: string): ProductItemView | undefined {
    return this.getForProduct(productId)[0];
  }

  // ── Admin CRUD (Admin Products > edit page: brand/variant management, task 99) ────────────────
  // Includes inactive items, unlike `views` — admins need to see/reactivate a deactivated variant.

  readonly adminItems = signal<ProductItem[]>([]);

  loadAdminItems(productId: string): void {
    if (environment.useMockData) {
      this.adminItems.set(this.rawItems().filter((i) => i.productId === productId));
      return;
    }
    this.http
      .get<ProductItem[]>(ADMIN_BASE, { params: { productId } })
      .subscribe((items) => this.adminItems.set(items));
  }

  createItem(productId: string, input: Omit<ProductItem, 'id' | 'productId' | 'active'>): void {
    if (!environment.useMockData) {
      this.http.post<ProductItem>(ADMIN_BASE, { ...input, productId }).subscribe((created) => {
        this.adminItems.update((list) => [...list, created]);
        this.refetchViews();
      });
      return;
    }

    const id = nextItemId(this.rawItems());
    const item: ProductItem = { ...input, id, productId, active: true };
    this.rawItems.update((list) => [...list, item]);
    this.adminItems.update((list) => [...list, item]);
    this.persistRaw();
  }

  updateItem(id: string, patch: Partial<Omit<ProductItem, 'id' | 'productId'>>): void {
    this.adminItems.update((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    // Optimistic patch on `fetchedViews` too — Admin Inventory (and Shop) read `views()`, not
    // `adminItems`, and may not have loaded this product's admin item list at all.
    this.fetchedViews.update((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));

    if (!environment.useMockData) {
      this.http.patch<ProductItem>(`${ADMIN_BASE}/${id}`, patch).subscribe((updated) => {
        this.adminItems.update((list) => list.map((i) => (i.id === id ? updated : i)));
        this.refetchViews();
      });
      return;
    }

    this.rawItems.update((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    this.persistRaw();
  }

  // Soft delete (active=false) — an item can't be hard-removed once it might be referenced by a
  // past order, mirroring the backend's own soft-delete convention.
  deactivateItem(id: string): void {
    this.updateItem(id, { active: false });
  }

  private persistRaw(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rawItems()));
  }
}

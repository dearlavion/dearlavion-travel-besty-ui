import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Product, PRODUCTS } from './product-catalog';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'travel-besty-products';
// Reads go through the public, unauthenticated endpoint — most consumers (Shop, Product Detail,
// My Kit suggestions) are anonymous-accessible pages, and this endpoint doesn't need a token.
// Only writes require the admin-guarded endpoint below.
const PUBLIC_BASE = `${environment.apiUrl}/products`;
const ADMIN_BASE = `${environment.apiUrl}/admin/products`;

// SSR prerenders /shop (see app.routes.server.ts) and Node has no localStorage — every
// read/write here must go through this guard or the build breaks.
function loadStoredProducts(): Product[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type NewProduct = Omit<Product, 'id'>;

interface ProductListResponse {
  content: Product[];
  page: number;
  size: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ProductCatalogService {
  private readonly http = inject(HttpClient);

  readonly products = signal<Product[]>(environment.useMockData ? (loadStoredProducts() ?? PRODUCTS) : []);

  // True once `products` reflects real data — immediately in mock mode, only after the GET
  // resolves (success or failure) in real mode. Lets consumers (e.g. admin edit pages) tell "not
  // loaded yet" apart from "genuinely doesn't exist" instead of a one-shot check racing the fetch.
  readonly loaded = signal(environment.useMockData);
  private fetchAllStarted = environment.useMockData;

  // Lazily fetches the full product list the first time something actually needs cross-product
  // lookups (Admin lists, Home/Travel's popular-kit cards, My Kit's related-products, or a
  // getById()/getRelated() call that needs the broad list to search). A single product's own page
  // doesn't need this at all — see loadOne()/currentProduct below, which is what
  // /product/:id[/items/:itemId] uses instead.
  ensureAllLoaded(): void {
    if (this.fetchAllStarted) return;
    this.fetchAllStarted = true;
    this.http
      .get<ProductListResponse>(PUBLIC_BASE, { params: { size: 200 } })
      .subscribe({
        next: (res) => {
          this.products.set(res.content);
          this.loaded.set(true);
        },
        error: () => this.loaded.set(true),
      });
  }

  // One product, freshly fetched from the targeted GET /products/:id endpoint rather than found
  // by filtering the full list — this is what ProductDetailComponent uses, so opening a single
  // product's page never has to pull all 200.
  readonly currentProduct = signal<Product | undefined>(undefined);

  loadOne(id: string): void {
    if (environment.useMockData) {
      this.currentProduct.set(this.getById(id));
      return;
    }
    this.currentProduct.set(undefined);
    this.http.get<Product>(`${PUBLIC_BASE}/${id}`).subscribe({
      next: (product) => this.currentProduct.set(product),
      error: () => this.currentProduct.set(undefined),
    });
  }

  // Checks `slug` too — PopularKit.productIds/Product.linkedProductIds reference products by
  // slug in real-backend mode, not the Mongo id that Product.id holds there.
  getById(id: string): Product | undefined {
    this.ensureAllLoaded();
    return this.products().find((p) => p.id === id || p.slug === id);
  }

  // Admin-curated explicit links first (in the order the admin added them), then same category,
  // then same destination/season, excluding the product itself and anything already included by
  // a higher tier. Mirrors the pure getRelatedProducts() logic in product-catalog.ts for the
  // automatic tiers, but reads the live signal so admin edits/deletes are reflected instead of
  // the frozen seed array.
  getRelated(product: Product, limit = 4): Product[] {
    this.ensureAllLoaded();
    const others = this.products().filter((p) => p.id !== product.id);

    const linked = (product.linkedProductIds ?? [])
      .map((id) => others.find((p) => p.id === id || p.slug === id))
      .filter((p): p is Product => !!p);
    const linkedIds = new Set(linked.map((p) => p.id));

    const remaining = others.filter((p) => !linkedIds.has(p.id));
    const sameCategory = remaining.filter((p) => p.category === product.category);
    const sameTrip = remaining.filter(
      (p) =>
        p.category !== product.category &&
        ((product.destinations.length > 0 && p.destinations.some((d) => product.destinations.includes(d))) ||
          (product.seasons.length > 0 && p.seasons.some((s) => product.seasons.includes(s)))),
    );

    return [...linked, ...sameCategory, ...sameTrip].slice(0, limit);
  }

  addProduct(input: NewProduct): Product {
    if (!environment.useMockData) {
      this.http.post<Product>(ADMIN_BASE, input).subscribe((created) => {
        this.products.update((list) => [...list, created]);
      });
      // Callers don't use the return value (fire-and-forget, same as the HTTP path above) — this
      // placeholder just satisfies the synchronous signature mock mode still needs.
      return { ...input, id: slugify(input.name) };
    }

    const baseSlug = slugify(input.name) || 'product';
    const existingIds = new Set(this.products().map((p) => p.id));
    let id = baseSlug;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const product: Product = { ...input, id };
    this.products.update((list) => [...list, product]);
    this.persist();
    return product;
  }

  updateProduct(id: string, patch: Partial<Omit<Product, 'id'>>): void {
    if (!environment.useMockData) {
      this.products.update((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      this.http.patch<Product>(`${ADMIN_BASE}/${id}`, patch).subscribe((updated) => {
        this.products.update((list) => list.map((p) => (p.id === id ? updated : p)));
      });
      return;
    }

    this.products.update((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    this.persist();
  }

  deleteProduct(id: string): void {
    if (!environment.useMockData) {
      // Backend soft-deletes (active:false, record kept) rather than removing it — mirror that
      // locally instead of dropping the row, so the local view matches server truth.
      this.http.delete(`${ADMIN_BASE}/${id}`).subscribe(() => {
        this.products.update((list) => list.map((p) => (p.id === id ? { ...p, active: false } : p)));
      });
      return;
    }

    this.products.update((list) => list.filter((p) => p.id !== id));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products()));
  }
}

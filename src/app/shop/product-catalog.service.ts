import { Injectable, signal } from '@angular/core';
import { Product, PRODUCTS } from './product-catalog';

const STORAGE_KEY = 'travel-besty-products';

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

@Injectable({ providedIn: 'root' })
export class ProductCatalogService {
  readonly products = signal<Product[]>(loadStoredProducts() ?? PRODUCTS);

  getById(id: string): Product | undefined {
    return this.products().find((p) => p.id === id);
  }

  // Admin-curated explicit links first (in the order the admin added them), then same category,
  // then same destination/season, excluding the product itself and anything already included by
  // a higher tier. Mirrors the pure getRelatedProducts() logic in product-catalog.ts for the
  // automatic tiers, but reads the live signal so admin edits/deletes are reflected instead of
  // the frozen seed array.
  getRelated(product: Product, limit = 4): Product[] {
    const others = this.products().filter((p) => p.id !== product.id);

    const linked = (product.linkedProductIds ?? [])
      .map((id) => others.find((p) => p.id === id))
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
    this.products.update((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    this.persist();
  }

  deleteProduct(id: string): void {
    this.products.update((list) => list.filter((p) => p.id !== id));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products()));
  }
}

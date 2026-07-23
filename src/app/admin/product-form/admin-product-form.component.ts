import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NewProduct, ProductCatalogService } from '../../shop/product-catalog.service';
import { Product, ProductDestination, ProductParty, ProductSeason } from '../../shop/product-catalog';
import { ProductItemService } from '../../shop/product-item.service';

interface ProductFormModel {
  name: string;
  category: string;
  description: string;
  icon: string;
  seasons: ProductSeason[];
  destinations: ProductDestination[];
  parties: ProductParty[];
  tested: boolean;
  active: boolean;
  linkedProductIds: string[];
}

function emptyForm(): ProductFormModel {
  return {
    name: '',
    category: '',
    description: '',
    icon: '🧳',
    seasons: [],
    destinations: [],
    parties: [],
    tested: true,
    active: true,
    linkedProductIds: [],
  };
}

const SEASON_OPTIONS: ProductSeason[] = ['Summer', 'Winter', 'Rainy'];
const DESTINATION_OPTIONS: ProductDestination[] = ['Beach', 'Mountain', 'City'];
const PARTY_OPTIONS: ProductParty[] = ['Solo', 'Group'];

// Shared add/edit form — no `:id` param means add mode, same toSignal(paramMap) pattern
// ProductDetailComponent uses to detect route param changes. Purchase data (price/stock/etc) is
// no longer part of this form directly — every product needs at least one ProductItem, added/edited
// on their own page (AdminProductItemFormComponent) reached from the item table below.
@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.css',
})
export class AdminProductFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  protected readonly seasonOptions = SEASON_OPTIONS;
  protected readonly destinationOptions = DESTINATION_OPTIONS;
  protected readonly partyOptions = PARTY_OPTIONS;

  protected readonly form = signal<ProductFormModel>(emptyForm());
  // Reactive, not a one-shot flag set in the constructor — real mode's product list loads async,
  // so a plain signal set once (before the catalog fetch resolves) would get permanently stuck
  // showing "not found" even after the data arrives. `catalog.loaded()` tells "still loading"
  // apart from "genuinely missing".
  protected readonly notFound = computed(() => {
    const id = this.editingId();
    return id !== null && this.catalog.loaded() && !this.catalog.getById(id);
  });
  protected readonly productSearch = signal('');

  // Products matching the current search, for the "link a product" checklist — excludes this
  // product itself (in edit mode) and anything already linked.
  protected readonly searchResults = computed<Product[]>(() => {
    const term = this.productSearch().trim().toLowerCase();
    const linked = new Set(this.form().linkedProductIds);
    const selfId = this.editingId();
    const list = this.catalog.products().filter((p) => p.id !== selfId && !linked.has(p.id));
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
  });

  // Currently-linked products, resolved to full Product records for display (in the order they
  // were added) — filters out any id whose product has since been deleted elsewhere in admin.
  protected readonly linkedProducts = computed<Product[]>(() =>
    this.form()
      .linkedProductIds.map((id) => this.catalog.getById(id))
      .filter((p): p is Product => !!p),
  );

  private formLoaded = false;

  constructor() {
    const id = this.editingId();
    if (!id) return; // add mode — nothing to load

    // Doesn't depend on the generic Product having loaded — items are looked up by productId (a
    // plain route string), not through ProductCatalogService.
    this.productItems.loadAdminItems(id);

    // Real-backend mode loads `catalog.products()` asynchronously — populate the form the moment
    // this product shows up rather than assuming it's already there synchronously (mock mode's
    // catalog is synchronous, so this fires on the very first run there).
    effect(() => {
      if (this.formLoaded) return;
      const existing = this.catalog.getById(id);
      if (!existing) return;
      this.formLoaded = true;
      this.form.set({
        name: existing.name,
        category: existing.category,
        description: existing.description,
        icon: existing.icon,
        seasons: [...existing.seasons],
        destinations: [...existing.destinations],
        parties: [...existing.parties],
        tested: existing.tested,
        active: existing.active,
        linkedProductIds: [...(existing.linkedProductIds ?? [])],
      });
    });
  }

  protected updateField<K extends keyof ProductFormModel>(key: K, value: ProductFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected isSeasonChecked(season: ProductSeason): boolean {
    return this.form().seasons.includes(season);
  }

  protected toggleSeason(season: ProductSeason): void {
    this.form.update((f) => ({ ...f, seasons: toggleInArray(f.seasons, season) }));
  }

  protected isDestinationChecked(destination: ProductDestination): boolean {
    return this.form().destinations.includes(destination);
  }

  protected toggleDestination(destination: ProductDestination): void {
    this.form.update((f) => ({ ...f, destinations: toggleInArray(f.destinations, destination) }));
  }

  protected isPartyChecked(party: ProductParty): boolean {
    return this.form().parties.includes(party);
  }

  protected toggleParty(party: ProductParty): void {
    this.form.update((f) => ({ ...f, parties: toggleInArray(f.parties, party) }));
  }

  protected addLinkedProduct(id: string): void {
    this.form.update((f) => (f.linkedProductIds.includes(id) ? f : { ...f, linkedProductIds: [...f.linkedProductIds, id] }));
  }

  protected removeLinkedProduct(id: string): void {
    this.form.update((f) => ({ ...f, linkedProductIds: f.linkedProductIds.filter((pid) => pid !== id) }));
  }

  protected save(): void {
    const f = this.form();
    const fields = {
      name: f.name.trim(),
      category: f.category.trim(),
      description: f.description.trim(),
      icon: f.icon.trim() || '🧳',
      seasons: f.seasons,
      destinations: f.destinations,
      parties: f.parties,
      tested: f.tested,
      active: f.active,
      linkedProductIds: f.linkedProductIds,
    };

    const id = this.editingId();
    if (id) {
      // `popular` isn't a form field — leave it untouched on edit rather than resetting it.
      this.catalog.updateProduct(id, fields);
      this.router.navigateByUrl('/admin/products');
      return;
    }

    const payload: NewProduct = { ...fields, popular: false };
    this.catalog.addProduct(payload);
    // Back to the list, same as edit mode — not straight to this product's own Edit page: in
    // real-backend mode the backend-assigned id/slug isn't reliably known until the POST
    // resolves, so treat "add item(s)" as a distinct next step via the list's Edit link.
    this.router.navigateByUrl('/admin/products');
  }

  // ── ProductItem deletion (inline, quick action) — add/edit happens on their own page,
  // AdminProductItemFormComponent, reached via the item table's Add/Edit links below. ───────────

  protected readonly confirmingDeleteItemId = signal<string | null>(null);

  protected requestDeleteItem(id: string): void {
    this.confirmingDeleteItemId.set(id);
  }

  protected cancelDeleteItem(): void {
    this.confirmingDeleteItemId.set(null);
  }

  protected confirmDeleteItem(id: string): void {
    this.productItems.deactivateItem(id);
    this.confirmingDeleteItemId.set(null);
  }
}

function toggleInArray<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NewProduct, ProductCatalogService } from '../../shop/product-catalog.service';
import { Product } from '../../shop/product-catalog';
import { ProductItemService } from '../../shop/product-item.service';
import { ToastService } from '../../common/toast/toast.service';
import { TaxonomyService } from '../../common/taxonomy.service';

interface ProductFormModel {
  name: string;
  category: string;
  description: string;
  icon: string;
  seasons: string[];
  destinations: string[];
  parties: string[];
  activities: string[];
  transportModes: string[];
  kitCategory: string; // '' = not yet chosen — save() blocks submit until it's set
  tested: boolean;
  active: boolean;
  popular: boolean;
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
    activities: [],
    transportModes: [],
    kitCategory: '',
    tested: true,
    active: true,
    popular: false,
    linkedProductIds: [],
  };
}

// Pre-fills Kit Category from the free-text Category field, so most products need zero extra
// thought — the admin just confirms or overrides. Keyed off today's actual `category` values
// (see product-catalog.ts). No entry for "Gear": it splits into Weather vs Activity Gear, a real
// judgment call that shouldn't get a silent default.
const CATEGORY_SUGGESTION: Record<string, string> = {
  Documents: 'Essentials',
  Accessories: 'Weather Gear',
  Electronics: 'Tech Pack',
  Health: 'Health & Safety',
  Clothing: 'Clothing',
  Comfort: 'Comfort',
  Toiletries: 'Toiletries',
};

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
  private readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);
  private readonly toast = inject(ToastService);
  private readonly taxonomy = inject(TaxonomyService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  // Sourced from the admin-editable Kit Settings taxonomy (see TaxonomyService), not hardcoded.
  protected readonly seasonOptions = computed(() => this.taxonomy.forAxis('season').map((v) => v.value));
  protected readonly destinationOptions = computed(() => this.taxonomy.forAxis('destination').map((v) => v.value));
  protected readonly partyOptions = computed(() => this.taxonomy.forAxis('party').map((v) => v.value));
  protected readonly activityOptions = computed(() => this.taxonomy.forAxis('activity').map((v) => v.value));
  protected readonly transportOptions = computed(() => this.taxonomy.forAxis('transportation').map((v) => v.value));
  protected readonly kitCategoryOptions = computed(() => this.taxonomy.forAxis('kitCategory').map((v) => v.value));

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
    // Reads catalog.products() directly (the "link a product" search picker below), in both add
    // and edit mode — needs the full list regardless of whether this product itself is found via
    // getById() below.
    this.catalog.ensureAllLoaded();

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
        activities: [...(existing.activities ?? [])],
        transportModes: [...(existing.transportModes ?? [])],
        kitCategory: existing.kitCategory,
        tested: existing.tested,
        active: existing.active,
        popular: existing.popular,
        linkedProductIds: [...(existing.linkedProductIds ?? [])],
      });
    });
  }

  protected updateField<K extends keyof ProductFormModel>(key: K, value: ProductFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected isSeasonChecked(season: string): boolean {
    return this.form().seasons.includes(season);
  }

  protected toggleSeason(season: string): void {
    this.form.update((f) => ({ ...f, seasons: toggleInArray(f.seasons, season) }));
  }

  protected isDestinationChecked(destination: string): boolean {
    return this.form().destinations.includes(destination);
  }

  protected toggleDestination(destination: string): void {
    this.form.update((f) => ({ ...f, destinations: toggleInArray(f.destinations, destination) }));
  }

  protected isPartyChecked(party: string): boolean {
    return this.form().parties.includes(party);
  }

  protected toggleParty(party: string): void {
    this.form.update((f) => ({ ...f, parties: toggleInArray(f.parties, party) }));
  }

  protected isActivityChecked(activity: string): boolean {
    return this.form().activities.includes(activity);
  }

  protected toggleActivity(activity: string): void {
    this.form.update((f) => ({ ...f, activities: toggleInArray(f.activities, activity) }));
  }

  protected isTransportChecked(mode: string): boolean {
    return this.form().transportModes.includes(mode);
  }

  protected toggleTransport(mode: string): void {
    this.form.update((f) => ({ ...f, transportModes: toggleInArray(f.transportModes, mode) }));
  }

  // Free-text Category changed — only auto-fills Kit Category while it's still unset, so this
  // never clobbers a value the admin already picked (including one that happens to match the
  // suggestion). Categories with no confident default (e.g. "Gear") leave it unset for an explicit pick.
  protected updateCategory(value: string): void {
    this.form.update((f) => {
      const suggestion = f.kitCategory === '' ? CATEGORY_SUGGESTION[value.trim()] : undefined;
      return { ...f, category: value, kitCategory: suggestion ?? f.kitCategory };
    });
  }

  protected updateKitCategory(value: string): void {
    this.form.update((f) => ({ ...f, kitCategory: value }));
  }

  protected addLinkedProduct(id: string): void {
    this.form.update((f) => (f.linkedProductIds.includes(id) ? f : { ...f, linkedProductIds: [...f.linkedProductIds, id] }));
  }

  protected removeLinkedProduct(id: string): void {
    this.form.update((f) => ({ ...f, linkedProductIds: f.linkedProductIds.filter((pid) => pid !== id) }));
  }

  protected save(): void {
    const f = this.form();
    if (!f.kitCategory) {
      this.toast.show('Pick a Kit Category before saving', 'error');
      return;
    }
    const fields = {
      name: f.name.trim(),
      category: f.category.trim(),
      description: f.description.trim(),
      icon: f.icon.trim() || '🧳',
      seasons: f.seasons,
      destinations: f.destinations,
      parties: f.parties,
      activities: f.activities,
      transportModes: f.transportModes,
      kitCategory: f.kitCategory,
      tested: f.tested,
      active: f.active,
      popular: f.popular,
      linkedProductIds: f.linkedProductIds,
    };

    const id = this.editingId();
    if (id) {
      this.catalog.updateProduct(id, fields);
      // Stays right here (reload, no url) — same as the item form's edit save: the admin's still
      // looking at this product and most likely wants to keep working on it, not get bounced back
      // to the full list.
      this.toast.showAndReload('Product updated');
      return;
    }

    const payload: NewProduct = fields;
    this.catalog.addProduct(payload);
    // Add mode still goes back to the list, not straight to this product's own Edit page: in
    // real-backend mode the backend-assigned id/slug isn't reliably known until the POST
    // resolves, so treat "add item(s)" as a distinct next step via the list's Edit link.
    this.toast.showAndReload('Product added', 'success', '/admin/products');
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
    this.toast.showAndReload('Item removed');
  }
}

function toggleInArray<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

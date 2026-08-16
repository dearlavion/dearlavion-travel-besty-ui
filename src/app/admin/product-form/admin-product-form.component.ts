import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NewProduct, ProductCatalogService } from '../../shop/product-catalog.service';
import { Product } from '../../shop/product-catalog';
import { ProductItemService } from '../../shop/product-item.service';
import { ToastService } from '../../common/toast/toast.service';
import {
  MasterDataCollection,
  MasterDataService,
  SectionSettings,
} from '../../common/master-data/master-data.service';
import { ProductTagFieldComponent } from './product-tag-field.component';

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
  durations: string[]; // display labels in the form; mapped to Duration codes on save
  genders: string[];
  kitCategories: string[]; // empty = not yet chosen — save() blocks submit until at least one
  // Values for admin-created collections, keyed by collection key. The built-in axes above keep
  // their own fields because the engine gives each bespoke meaning; anything registered at runtime
  // has no field to live in.
  tags: Record<string, string[]>;
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
    durations: [],
    genders: [],
    kitCategories: [],
    tags: {},
    tested: true,
    active: true,
    popular: false,
    linkedProductIds: [],
  };
}

// Shared add/edit form — no `:id` param means add mode, same toSignal(paramMap) pattern
// ProductDetailComponent uses to detect route param changes. Purchase data (price/stock/etc) is
// no longer part of this form directly — every product needs at least one ProductItem, added/edited
// on their own page (AdminProductItemFormComponent) reached from the item table below.
@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, ProductTagFieldComponent],
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.css',
})
export class AdminProductFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);
  private readonly toast = inject(ToastService);
  private readonly masterData = inject(MasterDataService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  // Sourced from the admin-editable Kit Settings master data (see MasterDataService), not hardcoded.
  protected readonly seasonOptions = computed(() => this.masterData.forType('season').map((v) => v.value));
  protected readonly destinationOptions = computed(() => this.masterData.forType('destination').map((v) => v.value));
  protected readonly partyOptions = computed(() => this.masterData.forType('party').map((v) => v.value));
  protected readonly activityOptions = computed(() => this.masterData.forType('activity').map((v) => v.value));
  protected readonly transportOptions = computed(() => this.masterData.forType('transportation').map((v) => v.value));
  protected readonly kitCategoryOptions = computed(() => this.masterData.forType('kitCategory').map((v) => v.value));
  // What the product IS — one per product, from master data (was a free-text box, which drifted).
  protected readonly productCategoryOptions = computed(() =>
    this.masterData.forType('productCategory').map((v) => v.value),
  );
  // Duration is shown by label but persisted by `code` (see durationCodeFor/durationLabelFor).
  protected readonly durationOptions = computed(() => this.masterData.forType('duration').map((v) => v.value));
  protected readonly genderOptions = computed(() => this.masterData.forType('gender').map((v) => v.value));

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

  // ── Previous/next product ─────────────────────────────────────────────────────────────────────
  // Same A→Z-by-name order the product list shows, so "next" here means the next row there rather
  // than an order that only exists on this page.
  private readonly orderedProducts = computed<Product[]>(() =>
    [...this.catalog.products()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  private readonly currentIndex = computed(() => {
    const id = this.editingId();
    if (id === null) return -1;
    // The route key may be an id or a slug (getById() accepts either), so match on both.
    return this.orderedProducts().findIndex((p) => p.id === id || p.slug === id);
  });

  protected readonly previousProduct = computed<Product | null>(() => {
    const i = this.currentIndex();
    return i > 0 ? this.orderedProducts()[i - 1] : null;
  });

  protected readonly nextProduct = computed<Product | null>(() => {
    const i = this.currentIndex();
    const list = this.orderedProducts();
    return i !== -1 && i < list.length - 1 ? list[i + 1] : null;
  });

  /** Keeps the URL in the same shape the current route uses — slug if you arrived by slug. */
  protected routeKeyFor(product: Product): string {
    const current = this.editingId();
    const arrivedBySlug = current !== null && product.slug !== undefined && this.orderedProducts().some((p) => p.slug === current);
    return arrivedBySlug ? (product.slug ?? product.id) : product.id;
  }

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

  // Which product the form currently holds. Not a boolean "loaded" flag: the previous/next links
  // move between products on the same route, and Angular reuses this component instance for that,
  // so the only signal that the form needs repopulating is the route id changing.
  private loadedProductId: string | null = null;

  constructor() {
    // Reads catalog.products() directly (the "link a product" search picker below), in both add
    // and edit mode — needs the full list regardless of whether this product itself is found via
    // getById() below.
    this.catalog.ensureAllLoaded();

    // Reads editingId() inside the effect (not once in the constructor) so navigating between
    // products re-runs it. Real-backend mode also loads `catalog.products()` asynchronously, so
    // this doubles as "populate the moment this product shows up" — mock mode's catalog is
    // synchronous and fires on the first run.
    effect(() => {
      const id = this.editingId();
      if (!id) return; // add mode — nothing to load
      if (this.loadedProductId === id) return; // already showing this product
      const existing = this.catalog.getById(id);
      if (!existing) return; // catalog still loading
      this.loadedProductId = id;

      // Item lookups key off the route id directly, not the resolved Product.
      this.productItems.loadAdminItems(id);

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
        durations: (existing.durations ?? []).map((code) => this.durationLabelFor(code)),
        genders: [...(existing.genders ?? [])],
        kitCategories: [...(existing.kitCategories ?? [])],
        tags: { ...(existing.tags ?? {}) },
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








  /** Duration rows carry a stable `code` the survey answers with; everything else keys off `value`. */
  private durationCodeFor(label: string): string {
    return this.masterData.forType('duration').find((v) => v.value === label)?.code ?? label;
  }

  private durationLabelFor(code: string): string {
    return this.masterData.forType('duration').find((v) => v.code === code)?.value ?? code;
  }

  // Free-text Category changed — only auto-fills Kit Category while it's still unset, so this
  // never clobbers a value the admin already picked (including one that happens to match the
  // suggestion). Categories with no confident default (e.g. "Gear") leave it unset for an explicit pick.

  protected updateCategory(value: string): void {
    // No kit-category pre-fill any more: which kit a product belongs to depends on the item, not
    // its type — Clothing splits across Weather, Comfort and Activity Gear kits (a rain jacket vs
    // pyjamas vs hiking socks), so a silent default would be wrong more often than right.
    this.form.update((f) => ({ ...f, category: value }));
  }

  // ── Dynamic tagging fields ────────────────────────────────────────────────────────────────
  // Built-in collections map to their own typed field; everything else lands in `tags`. That's the
  // whole reason this is a lookup rather than a generic map for all of them: the engine reads the
  // named fields with bespoke meaning (hard filters, per-axis weights), while a runtime-registered
  // collection has no such meaning yet.
  private static readonly FIELD_BY_KEY: Record<string, keyof ProductFormModel> = {
    destination: 'destinations',
    season: 'seasons',
    party: 'parties',
    transportation: 'transportModes',
    activity: 'activities',
    kitCategory: 'kitCategories',
    duration: 'durations',
    gender: 'genders',
  };

  /** Category first, then kit categories, then the survey's own step order, then anything new. */
  protected readonly tagCollections = computed<MasterDataCollection[]>(() => {
    const all = this.masterData.collections();
    const lead = ['productCategory', 'kitCategory'];
    const ordered = [...lead, ...this.masterData.typeOrder().filter((k) => !lead.includes(k))];
    const byKey = new Map(all.map((c) => [c.key, c]));
    const first = ordered.map((k) => byKey.get(k)).filter((c): c is MasterDataCollection => !!c);
    const seen = new Set(first.map((c) => c.key));
    return [...first, ...all.filter((c) => !seen.has(c.key))];
  });

  protected optionsFor(key: string): string[] {
    return this.masterData.forType(key).map((v) => v.value);
  }

  /**
   * A collection the admin registered at runtime defaults to an optional multi-select — a loose
   * tag — until someone gives it a shape in Kit Settings. The built-ins carry real defaults there.
   */
  protected settingsFor(key: string): SectionSettings {
    return this.masterData.sectionSettings()[key] ?? { required: false, multiple: true };
  }

  protected selectedFor(key: string): string[] {
    const f = this.form();
    if (key === 'productCategory') return f.category ? [f.category] : [];
    const field = AdminProductFormComponent.FIELD_BY_KEY[key];
    if (field) return f[field] as string[];
    return f.tags[key] ?? [];
  }

  protected toggleTag(key: string, value: string): void {
    if (key === 'productCategory') return this.updateCategory(value);
    if (key === 'kitCategory') return this.toggleKitCategory(value);

    const field = AdminProductFormComponent.FIELD_BY_KEY[key];
    if (field) {
      // 'All' is mutually exclusive with specific picks on the built-in axes — see the helper.
      this.form.update((f) => ({ ...f, [field]: toggleWithAllSentinel(f[field] as string[], value) }));
      return;
    }
    this.form.update((f) => {
      const current = f.tags[key] ?? [];
      const multiple = this.settingsFor(key).multiple;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : multiple
          ? [...current, value]
          : [value];
      return { ...f, tags: { ...f.tags, [key]: next } };
    });
  }

  /**
   * Hand-written copy per built-in axis: each says something a generated sentence can't (what 'no
   * selection' means, or what the field actually drives). A runtime-registered collection has no
   * entry and falls back to the component's own label.
   */
  private static readonly DESCRIPTIONS: Record<string, string> = {
    productCategory: 'Category — what this product is (shown on the shop card)',
    kitCategory: 'Kit Categories — which packing-list buckets this belongs to (boosts it when a shopper says one matters most)',
    season: 'Seasons (none selected = applies to all)',
    destination: 'Destinations (none selected = applies to all)',
    party: 'Party size (none selected = applies to all)',
    activity: 'Activities (which trips this suits — powers the survey)',
    transportation: 'Transportation (none selected = applies to all)',
    duration: 'Trip length (none selected = suits any length)',
    gender: 'Gender (none selected = suits anyone)',
  };

  protected descriptionFor(key: string): string | null {
    return AdminProductFormComponent.DESCRIPTIONS[key] ?? null;
  }

  /** Only Kit Categories carries one today — which bucket a shopper's kit files it under. */
  protected hintFor(key: string): string | null {
    if (key !== 'kitCategory' || this.form().kitCategories.length < 2) return null;
    return `Filed under ${this.form().kitCategories[0]} in a shopper's kit; the rest widen what it matches.`;
  }

  protected toggleKitCategory(category: string): void {
    // No 'All' sentinel here: unlike the other tag fields, an empty list means "not chosen yet"
    // rather than "applies to all", so toggleWithAllSentinel() would be wrong.
    this.form.update((f) => ({
      ...f,
      kitCategories: f.kitCategories.includes(category)
        ? f.kitCategories.filter((c) => c !== category)
        : [...f.kitCategories, category],
    }));
  }

  protected addLinkedProduct(id: string): void {
    this.form.update((f) => (f.linkedProductIds.includes(id) ? f : { ...f, linkedProductIds: [...f.linkedProductIds, id] }));
  }

  protected removeLinkedProduct(id: string): void {
    this.form.update((f) => ({ ...f, linkedProductIds: f.linkedProductIds.filter((pid) => pid !== id) }));
  }

  protected save(): void {
    const f = this.form();
    // Category lost its `required` attribute when it stopped being a native input, so the check
    // moves here alongside the kit-category one.
    if (!f.category.trim()) {
      this.toast.show('Pick a Category before saving', 'error');
      return;
    }
    if (f.kitCategories.length === 0) {
      this.toast.show('Pick at least one Kit Category before saving', 'error');
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
      // 'All' is the sentinel for "unrestricted" and has no code — pass it through untouched.
      durations: f.durations.map((label) => (label === 'All' ? label : this.durationCodeFor(label))),
      genders: f.genders,
      kitCategories: f.kitCategories,
      tags: f.tags,
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

  // ── Delete this product ───────────────────────────────────────────────────────────────────────
  // Same two-step confirm the product list and the item table use. Note the backend soft-deletes
  // (active:false, record kept), so this is closer to "retire" than "erase" — matching what
  // catalog.deleteProduct() does everywhere else.
  protected readonly confirmingDeleteProduct = signal(false);

  protected requestDeleteProduct(): void {
    this.confirmingDeleteProduct.set(true);
  }

  protected cancelDeleteProduct(): void {
    this.confirmingDeleteProduct.set(false);
  }

  protected confirmDeleteProduct(): void {
    const id = this.editingId();
    if (!id) return;
    this.catalog.deleteProduct(id);
    this.confirmingDeleteProduct.set(false);
    this.toast.showAndReload('Product removed', 'success', '/admin/products');
  }

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

// 'All' and specific picks are mutually exclusive: choosing 'All' clears any specific picks (and
// vice versa) rather than letting them coexist — mirrors TravelComponent's own Destination 'All'
// sentinel handling (see toggleTag()).
function toggleWithAllSentinel(list: readonly string[], value: string): string[] {
  if (value === 'All') {
    return list.includes('All') ? [] : ['All'];
  }
  const withoutAll = list.filter((v) => v !== 'All');
  return withoutAll.includes(value) ? withoutAll.filter((v) => v !== value) : [...withoutAll, value];
}

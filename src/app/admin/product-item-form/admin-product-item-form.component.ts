import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { ProductItemService } from '../../shop/product-item.service';

interface ItemFormModel {
  name: string;
  brand: string;
  price: number;
  currency: string;
  image: string;
  icon: string;
  stock: number;
  soldOut: boolean;
}

function emptyItemForm(): ItemFormModel {
  return { name: '', brand: '', price: 0, currency: 'USD', image: '', icon: '', stock: 0, soldOut: false };
}

// Own page (not inline on the product edit form) — reached via "+ Add Item"/"Edit" on
// /admin/products/:productId/edit's item table. `:itemId` present = edit mode, same
// toSignal(paramMap) + no-id-means-add pattern AdminProductFormComponent uses for products.
@Component({
  selector: 'app-admin-product-item-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-product-item-form.component.html',
  styleUrl: './admin-product-item-form.component.css',
})
export class AdminProductItemFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly productId = computed(() => this.paramMap()?.get('productId') ?? '');
  protected readonly itemId = computed(() => this.paramMap()?.get('itemId') ?? null);
  protected readonly isEditMode = computed(() => this.itemId() !== null);

  protected readonly product = computed(() => this.catalog.getById(this.productId()));
  // Reactive, not a one-shot flag set in the constructor — real mode's product list loads async,
  // so a plain signal set once (before the catalog fetch resolves) would get permanently stuck
  // showing "not found" even after the data arrives. `catalog.loaded()` tells "still loading"
  // apart from "genuinely missing".
  protected readonly notFound = computed(() => this.catalog.loaded() && !this.product());

  protected readonly form = signal<ItemFormModel>(emptyItemForm());
  protected readonly confirmingDelete = signal(false);

  // Live preview of this item's resolved identity as the admin types — Name falls back to the
  // parent product's name (same rule the Shop-facing aggregate applies), Brand falls back to
  // "Standard" (this item's the product's sole/default variant, same label used elsewhere).
  protected readonly effectiveName = computed(() => this.form().name.trim() || this.product()?.name || '');
  protected readonly effectiveBrand = computed(() => this.form().brand.trim() || 'Standard');

  private formLoaded = false;

  constructor() {
    // Doesn't depend on the generic Product having loaded — items are looked up by productId
    // (a plain string from the route), not through ProductCatalogService.
    this.productItems.loadAdminItems(this.productId());

    // Real-backend mode loads `adminItems`/`catalog.products()` asynchronously (HTTP) — populate
    // the form the moment the data shows up rather than assuming it's already there synchronously
    // (mock mode is synchronous, so this fires on the very first run there either way).
    effect(() => {
      if (this.formLoaded) return;

      const itemId = this.itemId();
      if (itemId) {
        const item = this.productItems.adminItems().find((i) => i.id === itemId);
        if (!item) return;
        this.formLoaded = true;
        this.form.set({
          name: item.name,
          brand: item.brand ?? '',
          price: item.price,
          currency: item.currency,
          image: item.image ?? '',
          icon: item.icon ?? '',
          stock: item.stock,
          soldOut: item.soldOut,
        });
        return;
      }

      // Add mode: name is required, so default it to the product's own name — the admin can
      // still change it before saving.
      const product = this.product();
      if (!product) return;
      this.formLoaded = true;
      this.form.update((f) => ({ ...f, name: product.name }));
    });
  }

  protected updateField<K extends keyof ItemFormModel>(key: K, value: ItemFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected save(): void {
    const productId = this.productId();
    const f = this.form();
    const fields = {
      name: f.name.trim() || this.product()?.name || '',
      brand: f.brand.trim() || undefined,
      price: Math.max(0, Number(f.price) || 0),
      currency: f.currency.trim() || 'USD',
      image: f.image.trim() || undefined,
      icon: f.icon.trim() || undefined,
      stock: Math.max(0, Number(f.stock) || 0),
      soldOut: f.soldOut,
    };

    const itemId = this.itemId();
    if (itemId) {
      this.productItems.updateItem(itemId, fields);
    } else {
      this.productItems.createItem(productId, fields);
    }

    this.router.navigate(['/admin/products', productId, 'edit']);
  }

  protected requestDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    const itemId = this.itemId();
    if (!itemId) return;
    this.productItems.deactivateItem(itemId);
    this.router.navigate(['/admin/products', this.productId(), 'edit']);
  }
}

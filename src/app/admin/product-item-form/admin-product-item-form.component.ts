import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductVideo } from '../../shop/product-catalog';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { ProductItemService } from '../../shop/product-item.service';

const MAX_MEDIA = 5;

interface ItemFormModel {
  name: string;
  brand: string;
  sizeTier: number; // 0 = no size (single-size product), 1–3 otherwise
  sizeLabel: string;
  price: number;
  currency: string;
  image: string;
  images: string[];
  videos: ProductVideo[];
  icon: string;
  stock: number;
  soldOut: boolean;
}

function emptyItemForm(): ItemFormModel {
  return { name: '', brand: '', sizeTier: 0, sizeLabel: '', price: 0, currency: 'USD', image: '', images: [], videos: [], icon: '', stock: 0, soldOut: false };
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
          sizeTier: item.sizeTier ?? 0,
          sizeLabel: item.sizeLabel ?? '',
          price: item.price,
          currency: item.currency,
          image: item.image ?? '',
          images: item.images ?? [],
          videos: item.videos ?? [],
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

  protected readonly maxMedia = MAX_MEDIA;

  protected addImageSlot(): void {
    this.form.update((f) => (f.images.length >= MAX_MEDIA ? f : { ...f, images: [...f.images, ''] }));
  }

  protected updateImage(index: number, value: string): void {
    this.form.update((f) => ({ ...f, images: f.images.map((img, i) => (i === index ? value : img)) }));
  }

  // Dropping a photo that happened to be the explicit cover clears the override rather than
  // leaving `image` pointing at a URL no longer in the gallery — the effective cover then falls
  // back to whatever is left at images[0], same as if it had never been set.
  protected removeImage(index: number): void {
    this.form.update((f) => {
      const removedUrl = f.images[index];
      return {
        ...f,
        images: f.images.filter((_, i) => i !== index),
        image: f.image === removedUrl ? '' : f.image,
      };
    });
  }

  // The photo actually used as this item's cover elsewhere (Shop, etc.) — same
  // `image || images[0]` rule Shop's card template applies, kept in sync here so the gallery can
  // show which thumbnail is currently "it" without a separate, driftable source of truth.
  protected readonly effectiveCover = computed(() => this.form().image || this.form().images[0] || '');

  protected isCoverPhoto(url: string): boolean {
    return !!url && url === this.effectiveCover();
  }

  protected setCoverImage(url: string): void {
    if (!url) return;
    this.updateField('image', url);
  }

  protected addVideoSlot(): void {
    this.form.update((f) =>
      f.videos.length >= MAX_MEDIA ? f : { ...f, videos: [...f.videos, { title: '', url: '', author: '' }] },
    );
  }

  protected updateVideoField(index: number, key: keyof ProductVideo, value: string): void {
    this.form.update((f) => ({
      ...f,
      videos: f.videos.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }

  protected removeVideo(index: number): void {
    this.form.update((f) => ({ ...f, videos: f.videos.filter((_, i) => i !== index) }));
  }

  protected save(): void {
    const productId = this.productId();
    const f = this.form();
    const fields = {
      name: f.name.trim() || this.product()?.name || '',
      brand: f.brand.trim() || undefined,
      sizeTier: f.sizeTier > 0 ? Number(f.sizeTier) : undefined,
      sizeLabel: f.sizeLabel.trim() || undefined,
      price: Math.max(0, Number(f.price) || 0),
      currency: f.currency.trim() || 'USD',
      image: f.image.trim() || undefined,
      images: f.images.map((img) => img.trim()).filter(Boolean).slice(0, MAX_MEDIA),
      videos: f.videos
        .map((v) => ({ title: v.title.trim(), url: v.url.trim(), author: v.author?.trim() || undefined }))
        .filter((v) => v.title && v.url)
        .slice(0, MAX_MEDIA),
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

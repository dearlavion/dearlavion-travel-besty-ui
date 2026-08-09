import { Component, computed, effect, inject, QueryList, signal, ViewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductVideo } from '../../shop/product-catalog';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { computeEffectivePrice, ProductItemService, ProductItemView } from '../../shop/product-item.service';
import { ToastService } from '../../common/toast/toast.service';
import { ImageUploadFieldComponent } from '../../common/image-upload/image-upload-field.component';

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
  onSale: boolean;
  discountType: 'percent' | 'amount';
  discountValue: number;
}

function emptyItemForm(): ItemFormModel {
  return {
    name: '',
    brand: '',
    sizeTier: 0,
    sizeLabel: '',
    price: 0,
    currency: 'USD',
    image: '',
    images: [],
    videos: [],
    icon: '',
    stock: 0,
    soldOut: false,
    onSale: false,
    discountType: 'percent',
    discountValue: 0,
  };
}

// Own page (not inline on the product edit form) — reached via "+ Add Item"/"Edit" on
// /admin/products/:productId/edit's item table. `:itemId` present = edit mode, same
// toSignal(paramMap) + no-id-means-add pattern AdminProductFormComponent uses for products.
@Component({
  selector: 'app-admin-product-item-form',
  standalone: true,
  imports: [FormsModule, RouterLink, ImageUploadFieldComponent],
  templateUrl: './admin-product-item-form.component.html',
  styleUrl: './admin-product-item-form.component.css',
})
export class AdminProductItemFormComponent {
  // One instance per gallery photo slot, in the same order as form().images — used at save time
  // to commit any picked-but-not-yet-uploaded files before persisting the item.
  @ViewChildren(ImageUploadFieldComponent) private readonly imageFields!: QueryList<ImageUploadFieldComponent>;

  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(ProductCatalogService);
  protected readonly productItems = inject(ProductItemService);
  private readonly toast = inject(ToastService);
  private readonly paramMap = toSignal(this.route.paramMap);
  private readonly queryParamMap = toSignal(this.route.queryParamMap);

  protected readonly productId = computed(() => this.paramMap()?.get('productId') ?? '');
  protected readonly itemId = computed(() => this.paramMap()?.get('itemId') ?? null);
  protected readonly isEditMode = computed(() => this.itemId() !== null);

  protected readonly product = computed(() => this.catalog.getById(this.productId()));

  // Where "Back" goes depends on how the admin got here — Inventory links to a specific item's
  // edit page directly (bypassing the parent product page entirely), so the default "back to the
  // parent product" link would be a dead end for that flow. Inventory tags its links with
  // `?from=inventory`; anywhere else (the product edit page's item table) falls back to the
  // previous behavior. Carried through the toast's post-save reload for free since it's a query
  // param on the same URL, not extra state.
  protected readonly cameFromInventory = computed(() => this.queryParamMap()?.get('from') === 'inventory');
  protected readonly backLink = computed(() =>
    this.cameFromInventory() ? ['/admin/inventory'] : ['/admin/products', this.productId(), 'edit'],
  );
  protected readonly backLabel = computed(() =>
    this.cameFromInventory() ? 'Back to Inventory' : `Back to ${this.product()?.name ?? ''}`,
  );
  // Reactive, not a one-shot flag set in the constructor — real mode's product list loads async,
  // so a plain signal set once (before the catalog fetch resolves) would get permanently stuck
  // showing "not found" even after the data arrives. `catalog.loaded()` tells "still loading"
  // apart from "genuinely missing".
  protected readonly notFound = computed(() => this.catalog.loaded() && !this.product());

  protected readonly form = signal<ItemFormModel>(emptyItemForm());
  protected readonly confirmingDelete = signal(false);
  protected readonly saving = signal(false);

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
          onSale: item.onSale ?? false,
          discountType: item.discountType ?? 'percent',
          discountValue: item.discountValue ?? 0,
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

  // Shared by save() (persisted) and preview() (a throwaway snapshot, never sent to the backend).
  private buildFields() {
    const f = this.form();
    return {
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
      onSale: f.onSale,
      // Sent even when Sale is off, so toggling it back on later remembers the last-entered
      // values — harmless either way, since the discount math only ever applies when onSale=true.
      discountType: f.discountType,
      discountValue: Math.max(0, Number(f.discountValue) || 0),
    };
  }

  // Uploads any gallery photos picked but not yet sent to storage — nothing hits S3/Drive until
  // the admin actually saves, so abandoning the form doesn't leave orphaned uploads behind. Each
  // field emits its resolved URL via valueChange (already bound to updateImage()), which is what
  // actually updates form().images; this just also fixes up form().image (the cover) if it was
  // pointing at one of the just-replaced local preview URLs.
  private async commitPendingUploads(): Promise<void> {
    const fields = (this.imageFields?.toArray() ?? []).filter((f) => f.hasPendingUpload());
    if (fields.length === 0) return;

    const before = this.form().images.slice();
    const coverBefore = this.form().image;

    await Promise.all(fields.map((f) => f.commitUpload()));

    const after = this.form().images;
    before.forEach((oldUrl, i) => {
      if (oldUrl && oldUrl === coverBefore && after[i] !== oldUrl) {
        this.updateField('image', after[i]);
      }
    });
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.commitPendingUploads();
    } catch {
      this.saving.set(false);
      return; // commitUpload() already toasted the specific failure
    }

    const productId = this.productId();
    const fields = this.buildFields();

    const itemId = this.itemId();
    if (itemId) {
      // Edit mode stays right here — the admin just tuned a field (e.g. the cover photo) and
      // most likely wants to keep looking at/adjusting this same item, not get bounced back to
      // the parent product's item list. A full reload (no url) reloads this same page, guaranteeing
      // what's on screen reflects the real saved state, not just the optimistic local patch.
      this.productItems.updateItem(itemId, fields);
      this.toast.showAndReload('Item updated');
      return;
    }

    // Add mode has nowhere of its own to land on yet (no itemId until the create resolves), so
    // this still goes back to the parent, where the newly-added item now shows up in the list.
    this.productItems.createItem(productId, fields);
    this.toast.showAndReload('Item added', 'success', `/admin/products/${productId}/edit`);
  }

  // Opens the live product page in a new tab with the form's current (possibly unsaved) values
  // overlaid on top of the real item, so an admin can check e.g. a cover-photo swap looks right
  // before committing it — only meaningful in edit mode, since a not-yet-created item has no
  // route to preview against.
  protected preview(): void {
    const itemId = this.itemId();
    if (!itemId) return;
    const fields = this.buildFields();
    // Preview overlays raw form fields onto the live item, but `price` in ProductItemView is the
    // *effective* (already-discounted) price everywhere else reads it — without this, previewing
    // a sale wouldn't show the discount at all. Same math the backend pipeline / mock toView()
    // apply, run client-side since there's no round-trip to compute it for an unsaved draft.
    const draft: Partial<ProductItemView> = {
      ...fields,
      ...computeEffectivePrice(fields.price, fields.onSale, fields.discountType, fields.discountValue),
    };
    this.productItems.setPreviewDraft(itemId, draft);
    window.open(`/product/${this.productId()}/items/${itemId}`, '_blank');
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
    this.toast.showAndReload('Item removed', 'success', `/admin/products/${this.productId()}/edit`);
  }
}

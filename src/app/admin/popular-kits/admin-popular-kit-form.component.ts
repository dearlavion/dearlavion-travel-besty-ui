import { Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Destination, Duration, Party, Season } from '../../travel/kit-recommendation';
import { Product } from '../../shop/product-catalog';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { NewPopularKit, PopularKitsService } from './popular-kits.service';
import { ToastService } from '../../common/toast/toast.service';
import { ImageUploadFieldComponent } from '../../common/image-upload/image-upload-field.component';
import { MasterDataService } from '../../common/master-data/master-data.service';

interface PopularKitFormModel {
  name: string;
  tag: string;
  image: string;
  destination: Destination;
  season: Season;
  party: Party;
  duration: Duration;
  productIds: string[];
}

function emptyForm(): PopularKitFormModel {
  return {
    name: '',
    tag: '',
    image: '',
    destination: 'Beach',
    season: 'Summer',
    party: 'Solo',
    duration: 'Quick escape',
    productIds: [],
  };
}

// Shared add/edit form — same toSignal(paramMap) "no :id means add mode" pattern as
// AdminProductFormComponent.
@Component({
  selector: 'app-admin-popular-kit-form',
  standalone: true,
  imports: [FormsModule, RouterLink, ImageUploadFieldComponent],
  templateUrl: './admin-popular-kit-form.component.html',
  styleUrl: './admin-popular-kit-form.component.css',
})
export class AdminPopularKitFormComponent {
  @ViewChild(ImageUploadFieldComponent) private readonly imageField?: ImageUploadFieldComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly popularKits = inject(PopularKitsService);
  protected readonly catalog = inject(ProductCatalogService);
  private readonly toast = inject(ToastService);
  private readonly masterData = inject(MasterDataService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  // Sourced from the admin-editable Kit Settings master data (see MasterDataService), same source
  // as the admin product form and Shop's filters — this used to be its own hardcoded list, which
  // is exactly why it could silently drift out of sync with the other two.
  protected readonly destinationOptions = computed(() => this.masterData.forType('destination').map((v) => v.value));
  protected readonly seasonOptions = computed(() => this.masterData.forType('season').map((v) => v.value));
  protected readonly partyOptions = computed(() => this.masterData.forType('party').map((v) => v.value));
  protected readonly durationOptions = computed(() => this.masterData.forType('duration').map((v) => v.value));

  protected readonly form = signal<PopularKitFormModel>(emptyForm());
  // Reactive, not a one-shot flag set in the constructor — real mode's kits list loads async, so a
  // plain synchronous check on the first (still-empty) kits() would permanently misreport "not
  // found" for a kit that genuinely exists whenever this page is the first one loaded (e.g. a
  // direct link/reload straight onto the edit URL, not navigated to from the list).
  protected readonly notFound = computed(() => this.popularKits.loaded() && this.isEditMode() && !this.popularKits.getById(this.editingId()!));
  protected readonly productSearch = signal('');
  protected readonly saving = signal(false);

  // Products matching the current search, for the "add a product" checklist below.
  protected readonly searchResults = computed<Product[]>(() => {
    const term = this.productSearch().trim().toLowerCase();
    const linked = new Set(this.form().productIds);
    const list = this.catalog.products().filter((p) => !linked.has(p.id));
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
  });

  // Currently-linked products, resolved to full Product records for display (in the order they
  // were added) — filters out any id whose product has since been deleted elsewhere in admin.
  protected readonly linkedProducts = computed<Product[]>(() =>
    this.form()
      .productIds.map((id) => this.catalog.getById(id))
      .filter((p): p is Product => !!p),
  );

  private formLoaded = false;

  constructor() {
    // Reads catalog.products() directly (the "add a product" search picker below), regardless of
    // add/edit mode.
    this.catalog.ensureAllLoaded();

    // Real-backend mode loads popularKits.kits() asynchronously (HTTP) — populate the form the
    // moment the data shows up rather than assuming it's already there synchronously (mock mode is
    // synchronous, so this fires on the very first run there either way).
    effect(() => {
      if (this.formLoaded) return;
      const id = this.editingId();
      if (!id) return;
      const existing = this.popularKits.getById(id);
      if (!existing) return;
      this.formLoaded = true;
      this.form.set({
        name: existing.name,
        tag: existing.tag,
        image: existing.image,
        destination: existing.destination,
        season: existing.season,
        party: existing.party,
        duration: existing.duration,
        productIds: [...existing.productIds],
      });
    });
  }

  protected updateField<K extends keyof PopularKitFormModel>(key: K, value: PopularKitFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected addProduct(id: string): void {
    this.form.update((f) => (f.productIds.includes(id) ? f : { ...f, productIds: [...f.productIds, id] }));
  }

  protected removeProduct(id: string): void {
    this.form.update((f) => ({ ...f, productIds: f.productIds.filter((pid) => pid !== id) }));
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    if (this.imageField?.hasPendingUpload()) {
      try {
        await this.imageField.commitUpload();
      } catch {
        this.saving.set(false);
        return; // commitUpload() already toasted the specific failure
      }
    }

    const f = this.form();
    const fields: NewPopularKit = {
      name: f.name.trim(),
      tag: f.tag.trim(),
      image: f.image.trim() || `https://picsum.photos/seed/${Date.now()}/600/420`,
      destination: f.destination,
      season: f.season,
      party: f.party,
      duration: f.duration,
      productIds: f.productIds,
    };

    const id = this.editingId();
    if (id) {
      this.popularKits.updateKit(id, fields);
      this.toast.showAndReload('Kit updated', 'success', '/admin/popular-kits');
    } else {
      this.popularKits.addKit(fields);
      this.toast.showAndReload('Kit added', 'success', '/admin/popular-kits');
    }
  }
}

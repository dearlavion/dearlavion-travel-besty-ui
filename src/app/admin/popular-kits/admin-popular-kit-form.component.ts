import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Destination, Duration, Party, Season } from '../../travel/kit-recommendation';
import { Product } from '../../shop/product-catalog';
import { ProductCatalogService } from '../../shop/product-catalog.service';
import { NewPopularKit, PopularKitsService } from './popular-kits.service';

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

const DESTINATION_OPTIONS: Destination[] = ['Beach', 'Mountain', 'City'];
const SEASON_OPTIONS: Season[] = ['Summer', 'Winter', 'Rainy'];
const PARTY_OPTIONS: Party[] = ['Solo', 'Group'];
const DURATION_OPTIONS: Duration[] = ['Quick escape', 'A proper break', 'Living it'];

// Shared add/edit form — same toSignal(paramMap) "no :id means add mode" pattern as
// AdminProductFormComponent.
@Component({
  selector: 'app-admin-popular-kit-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-popular-kit-form.component.html',
  styleUrl: './admin-popular-kit-form.component.css',
})
export class AdminPopularKitFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly popularKits = inject(PopularKitsService);
  protected readonly catalog = inject(ProductCatalogService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  protected readonly destinationOptions = DESTINATION_OPTIONS;
  protected readonly seasonOptions = SEASON_OPTIONS;
  protected readonly partyOptions = PARTY_OPTIONS;
  protected readonly durationOptions = DURATION_OPTIONS;

  protected readonly form = signal<PopularKitFormModel>(emptyForm());
  protected readonly notFound = signal(false);
  protected readonly productSearch = signal('');

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

  constructor() {
    // Reads catalog.products() directly (the "add a product" search picker below), regardless of
    // add/edit mode.
    this.catalog.ensureAllLoaded();

    const id = this.editingId();
    if (id) {
      const existing = this.popularKits.getById(id);
      if (existing) {
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
      } else {
        this.notFound.set(true);
      }
    }
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

  protected save(): void {
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
    } else {
      this.popularKits.addKit(fields);
    }

    this.router.navigateByUrl('/admin/popular-kits');
  }
}

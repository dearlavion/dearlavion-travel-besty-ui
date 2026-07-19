import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NewProduct, ProductCatalogService } from '../../shop/product-catalog.service';
import { ProductDestination, ProductParty, ProductSeason } from '../../shop/product-catalog';

interface ProductFormModel {
  name: string;
  category: string;
  description: string;
  price: number;
  icon: string;
  image: string;
  seasons: ProductSeason[];
  destinations: ProductDestination[];
  parties: ProductParty[];
  stock: number;
  soldOut: boolean;
  tested: boolean;
  active: boolean;
}

function emptyForm(): ProductFormModel {
  return {
    name: '',
    category: '',
    description: '',
    price: 0,
    icon: '🧳',
    image: '',
    seasons: [],
    destinations: [],
    parties: [],
    stock: 0,
    soldOut: false,
    tested: true,
    active: true,
  };
}

const SEASON_OPTIONS: ProductSeason[] = ['Summer', 'Winter', 'Rainy'];
const DESTINATION_OPTIONS: ProductDestination[] = ['Beach', 'Mountain', 'City'];
const PARTY_OPTIONS: ProductParty[] = ['Solo', 'Group'];

// Every product in this mock catalog uses the same currency — not worth exposing as a form field.
const DEFAULT_CURRENCY = 'USD';

// Shared add/edit form — no `:id` param means add mode, same toSignal(paramMap) pattern
// ProductDetailComponent uses to detect route param changes.
@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.css',
})
export class AdminProductFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(ProductCatalogService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly editingId = computed(() => this.paramMap()?.get('id') ?? null);
  protected readonly isEditMode = computed(() => this.editingId() !== null);

  protected readonly seasonOptions = SEASON_OPTIONS;
  protected readonly destinationOptions = DESTINATION_OPTIONS;
  protected readonly partyOptions = PARTY_OPTIONS;

  protected readonly form = signal<ProductFormModel>(emptyForm());
  protected readonly notFound = signal(false);

  constructor() {
    const id = this.editingId();
    if (id) {
      const existing = this.catalog.getById(id);
      if (existing) {
        this.form.set({
          name: existing.name,
          category: existing.category,
          description: existing.description,
          price: existing.price,
          icon: existing.icon,
          image: existing.image ?? '',
          seasons: [...existing.seasons],
          destinations: [...existing.destinations],
          parties: [...existing.parties],
          stock: existing.stock,
          soldOut: existing.soldOut,
          tested: existing.tested,
          active: existing.active,
        });
      } else {
        this.notFound.set(true);
      }
    }
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

  protected save(): void {
    const f = this.form();
    const fields = {
      name: f.name.trim(),
      category: f.category.trim(),
      description: f.description.trim(),
      price: Number(f.price) || 0,
      icon: f.icon.trim() || '🧳',
      image: f.image.trim() || undefined,
      currency: DEFAULT_CURRENCY,
      seasons: f.seasons,
      destinations: f.destinations,
      parties: f.parties,
      stock: Math.max(0, Number(f.stock) || 0),
      soldOut: f.soldOut,
      tested: f.tested,
      active: f.active,
    };

    const id = this.editingId();
    if (id) {
      // `popular` isn't a form field — leave it untouched on edit rather than resetting it.
      this.catalog.updateProduct(id, fields);
    } else {
      const payload: NewProduct = { ...fields, popular: false };
      this.catalog.addProduct(payload);
    }

    this.router.navigateByUrl('/admin/products');
  }
}

function toggleInArray<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

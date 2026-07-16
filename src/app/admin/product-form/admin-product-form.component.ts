import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NewProduct, ProductCatalogService } from '../../shop/product-catalog.service';
import { ProductDestination, ProductSeason } from '../../shop/product-catalog';

interface ProductFormModel {
  name: string;
  category: string;
  desc: string;
  price: number;
  icon: string;
  season: ProductSeason;
  destination: ProductDestination;
  stock: number;
  soldOut: boolean;
}

function emptyForm(): ProductFormModel {
  return {
    name: '',
    category: '',
    desc: '',
    price: 0,
    icon: '🧳',
    season: 'All',
    destination: 'All',
    stock: 0,
    soldOut: false,
  };
}

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
          desc: existing.desc,
          price: existing.price,
          icon: existing.icon,
          season: existing.season,
          destination: existing.destination,
          stock: existing.stock,
          soldOut: existing.soldOut,
        });
      } else {
        this.notFound.set(true);
      }
    }
  }

  protected updateField<K extends keyof ProductFormModel>(key: K, value: ProductFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected save(): void {
    const f = this.form();
    const fields = {
      name: f.name.trim(),
      category: f.category.trim(),
      desc: f.desc.trim(),
      price: Number(f.price) || 0,
      icon: f.icon.trim() || '🧳',
      season: f.season,
      destination: f.destination,
      stock: Math.max(0, Number(f.stock) || 0),
      soldOut: f.soldOut,
    };

    const id = this.editingId();
    if (id) {
      // `popular` isn't a form field — leave it untouched on edit rather than resetting it.
      this.catalog.updateProduct(id, fields);
    } else {
      const payload: NewProduct = { ...fields, popular: false };
      this.catalog.addProduct(payload);
    }

    this.router.navigateByUrl('/admin');
  }
}

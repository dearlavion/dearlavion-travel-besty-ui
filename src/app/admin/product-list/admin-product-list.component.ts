import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductCatalogService } from '../../shop/product-catalog.service';

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './admin-product-list.component.html',
  styleUrl: './admin-product-list.component.css',
})
export class AdminProductListComponent {
  protected readonly catalog = inject(ProductCatalogService);

  protected readonly search = signal('');
  protected readonly confirmingDeleteId = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.catalog.products();
    if (!term) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term),
    );
  });

  protected setStock(id: string, value: string): void {
    const stock = Math.max(0, Number(value) || 0);
    this.catalog.updateProduct(id, { stock });
  }

  protected toggleSoldOut(id: string, soldOut: boolean): void {
    this.catalog.updateProduct(id, { soldOut });
  }

  protected toggleActive(id: string, active: boolean): void {
    this.catalog.updateProduct(id, { active });
  }

  protected requestDelete(id: string): void {
    this.confirmingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(id: string): void {
    this.catalog.deleteProduct(id);
    this.confirmingDeleteId.set(null);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product, getProductTint } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';

// The reusable template for any single product — one route (`/product/:id`), the id decides
// what renders. No real backend/cart yet, so "Add to Kit" is a mocked inline confirmation,
// same spirit as the rest of this app's mock interactions (auth forms, travel quiz reveal).
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(ProductCatalogService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly getProductTint = getProductTint;
  protected readonly added = signal(false);

  protected readonly product = computed<Product | undefined>(() => {
    const id = this.paramMap()?.get('id');
    return id ? this.catalog.getById(id) : undefined;
  });

  protected readonly relatedProducts = computed<Product[]>(() => {
    const product = this.product();
    return product ? this.catalog.getRelated(product) : [];
  });

  protected addToKit(): void {
    this.added.set(true);
    setTimeout(() => this.added.set(false), 2000);
  }
}

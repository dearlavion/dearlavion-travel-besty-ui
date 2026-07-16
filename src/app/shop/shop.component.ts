import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductDestination, ProductSeason, getProductTint } from './product-catalog';
import { ProductCatalogService } from './product-catalog.service';

type SortOption = 'default' | 'popular' | 'price-low' | 'price-high' | 'name';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css',
})
export class ShopComponent implements OnInit {
  private readonly catalog = inject(ProductCatalogService);

  protected readonly search = signal('');
  protected readonly season = signal<ProductSeason>('All');
  protected readonly destination = signal<ProductDestination>('All');
  protected readonly sortBy = signal<SortOption>('default');
  protected readonly getProductTint = getProductTint;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const season = this.season();
    const destination = this.destination();

    let list = this.catalog.products().filter((p) => {
      if (season !== 'All' && p.season !== 'All' && p.season !== season) return false;
      if (destination !== 'All' && p.destination !== 'All' && p.destination !== destination) return false;
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !p.desc.toLowerCase().includes(term) &&
        !p.category.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });

    const sortBy = this.sortBy();
    if (sortBy === 'popular') {
      list = [...list].sort((a, b) => (b.popular === a.popular ? 0 : b.popular ? 1 : -1));
    } else if (sortBy === 'price-low') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  });

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Home's "Shop by destination" chips/footer links pass this through — a light functional
    // wiring beyond the static mockup (which has no URL-driven state at all).
    const destinationParam = this.route.snapshot.queryParamMap.get('destination');
    if (destinationParam === 'Beach' || destinationParam === 'Mountain' || destinationParam === 'City') {
      this.destination.set(destinationParam);
    }
  }
}

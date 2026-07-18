import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductDestination, ProductSeason, getProductTint } from './product-catalog';
import { ProductCatalogService } from './product-catalog.service';
import { CartService } from '../cart/cart.service';

type SortOption = 'default' | 'popular' | 'price-low' | 'price-high' | 'name';

const SEASON_OPTIONS: { value: ProductSeason; label: string }[] = [
  { value: 'Summer', label: '☀️ Summer' },
  { value: 'Winter', label: '❄️ Winter' },
  { value: 'Rainy', label: '🌧️ Rainy' },
];

const DESTINATION_OPTIONS: { value: ProductDestination; label: string }[] = [
  { value: 'Beach', label: '🏖️ Beach' },
  { value: 'Mountain', label: '⛰️ Mountain' },
  { value: 'City', label: '🏙️ City' },
];

// Empty `selected` = no filter applied (show everything). Once a chip is active, matching is
// strict — a product only shows up if it's explicitly tagged with a selected value. An empty
// `tags` array ("unrestricted") does NOT auto-match here: most of the catalog carries no
// season/destination tags at all, and treating that as "matches every filter" made the chips look
// broken (selecting Beach barely narrowed the grid because untagged items never dropped out).
function matchesFilter<T extends string>(tags: readonly T[], selected: ReadonlySet<T>): boolean {
  if (selected.size === 0) return true;
  return tags.some((tag) => selected.has(tag));
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css',
})
export class ShopComponent implements OnInit {
  private readonly catalog = inject(ProductCatalogService);
  private readonly cart = inject(CartService);

  protected readonly search = signal('');
  protected readonly seasons = signal<ReadonlySet<ProductSeason>>(new Set());
  protected readonly destinations = signal<ReadonlySet<ProductDestination>>(new Set());
  protected readonly sortBy = signal<SortOption>('default');
  protected readonly getProductTint = getProductTint;
  protected readonly addedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly seasonOptions = SEASON_OPTIONS;
  protected readonly destinationOptions = DESTINATION_OPTIONS;

  protected readonly seasonMenuOpen = signal(false);
  protected readonly destinationMenuOpen = signal(false);

  protected readonly seasonButtonLabel = computed(() => {
    const count = this.seasons().size;
    return count > 0 ? `Season (${count})` : 'Season';
  });

  protected readonly destinationButtonLabel = computed(() => {
    const count = this.destinations().size;
    return count > 0 ? `Destination (${count})` : 'Destination';
  });

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const seasons = this.seasons();
    const destinations = this.destinations();

    let list = this.catalog.products().filter((p) => {
      if (!p.active) return false;
      if (!matchesFilter(p.seasons, seasons)) return false;
      if (!matchesFilter(p.destinations, destinations)) return false;
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !p.description.toLowerCase().includes(term) &&
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
      this.destinations.set(new Set([destinationParam]));
    }
  }

  protected isSeasonSelected(season: ProductSeason): boolean {
    return this.seasons().has(season);
  }

  protected toggleSeason(season: ProductSeason): void {
    const next = new Set(this.seasons());
    if (next.has(season)) next.delete(season);
    else next.add(season);
    this.seasons.set(next);
  }

  protected isDestinationSelected(destination: ProductDestination): boolean {
    return this.destinations().has(destination);
  }

  protected toggleDestination(destination: ProductDestination): void {
    const next = new Set(this.destinations());
    if (next.has(destination)) next.delete(destination);
    else next.add(destination);
    this.destinations.set(next);
  }

  protected toggleSeasonMenu(): void {
    this.destinationMenuOpen.set(false);
    this.seasonMenuOpen.update((open) => !open);
  }

  protected toggleDestinationMenu(): void {
    this.seasonMenuOpen.set(false);
    this.destinationMenuOpen.update((open) => !open);
  }

  // Closes both filter dropdowns on any click outside them — checkbox clicks and the toggle
  // buttons themselves live inside `.filter-dropdown`, so they never trigger this.
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.seasonMenuOpen.set(false);
      this.destinationMenuOpen.set(false);
    }
  }

  protected isAdded(productId: string): boolean {
    return this.addedIds().has(productId);
  }

  protected addToCart(event: Event, productId: string): void {
    event.preventDefault();
    event.stopPropagation();

    this.cart.addItem(productId);

    const next = new Set(this.addedIds());
    next.add(productId);
    this.addedIds.set(next);

    setTimeout(() => {
      const reverted = new Set(this.addedIds());
      reverted.delete(productId);
      this.addedIds.set(reverted);
    }, 2000);
  }
}

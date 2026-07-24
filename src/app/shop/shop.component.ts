import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PricePipe } from '../common/price.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductDestination, ProductSeason, getProductTint } from './product-catalog';
import { ProductItemService, ProductItemView } from './product-item.service';
import { CartService } from '../cart/cart.service';
import { PaginationComponent } from '../common/pagination/pagination.component';

type SortOption = 'default' | 'popular' | 'price-low' | 'price-high' | 'name';
const PAGE_SIZE = 50;

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
  imports: [FormsModule, PricePipe, RouterLink, PaginationComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css',
})
export class ShopComponent implements OnInit {
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);

  protected readonly search = signal('');
  protected readonly seasons = signal<ReadonlySet<ProductSeason>>(new Set());
  protected readonly destinations = signal<ReadonlySet<ProductDestination>>(new Set());
  protected readonly sortBy = signal<SortOption>('default');
  protected readonly getProductTint = getProductTint;
  protected readonly addedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly page = signal(0); // 0-indexed

  protected readonly seasonOptions = SEASON_OPTIONS;
  protected readonly destinationOptions = DESTINATION_OPTIONS;

  protected readonly seasonMenuOpen = signal(false);
  protected readonly destinationMenuOpen = signal(false);

  protected readonly seasonButtonLabel = computed(() => {
    const selected = this.seasons();
    return selected.size > 0 ? [...selected].join(', ') : 'All';
  });

  protected readonly destinationButtonLabel = computed(() => {
    const selected = this.destinations();
    return selected.size > 0 ? [...selected].join(', ') : 'All';
  });

  protected readonly filtered = computed<ProductItemView[]>(() => {
    const term = this.search().trim().toLowerCase();
    const seasons = this.seasons();
    const destinations = this.destinations();

    // `views()` is already active-only/purchasable-only (see ProductItemService) — no separate
    // `.active` check needed here, unlike the old Product-based filter.
    let list = this.productItems.views().filter((p) => {
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

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  // Clamps in the same read — a new search/filter narrowing the result set falls back to the new
  // last page instead of showing a blank grid.
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedItems = computed<ProductItemView[]>(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  constructor(private route: ActivatedRoute) {
    // The one place that needs the whole catalog (browsing/search/filter) — everything else
    // (Product Detail, Cart, My Kit) either uses a targeted per-product fetch or triggers this
    // lazily itself only when it actually needs a cross-product lookup.
    this.productItems.ensureCatalogLoaded();
  }

  ngOnInit(): void {
    // Home's "Shop by destination" chips/footer links pass this through — a light functional
    // wiring beyond the static mockup (which has no URL-driven state at all).
    const destinationParam = this.route.snapshot.queryParamMap.get('destination');
    if (destinationParam === 'Beach' || destinationParam === 'Mountain' || destinationParam === 'City') {
      this.destinations.set(new Set([destinationParam]));
    }

    // My Kit's "Load more suggestions" link passes a product category through here — `filtered`
    // already matches search terms against category text, so pre-filling the search box is
    // enough to land the user on the full set of that category's products.
    const searchParam = this.route.snapshot.queryParamMap.get('search');
    if (searchParam) {
      this.search.set(searchParam);
    }
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0); // a new search invalidates whatever page the shopper was on
  }

  protected isSeasonSelected(season: ProductSeason): boolean {
    return this.seasons().has(season);
  }

  protected toggleSeason(season: ProductSeason): void {
    const next = new Set(this.seasons());
    if (next.has(season)) next.delete(season);
    else next.add(season);
    this.seasons.set(next);
    this.page.set(0);
  }

  protected isDestinationSelected(destination: ProductDestination): boolean {
    return this.destinations().has(destination);
  }

  protected toggleDestination(destination: ProductDestination): void {
    const next = new Set(this.destinations());
    if (next.has(destination)) next.delete(destination);
    else next.add(destination);
    this.destinations.set(next);
    this.page.set(0);
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

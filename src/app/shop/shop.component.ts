import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PricePipe } from '../common/price.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductDestination, ProductSeason, getProductTint } from './product-catalog';
import { ProductItemService, ProductItemView } from './product-item.service';
import { CartService } from '../cart/cart.service';
import { PaginationComponent } from '../common/pagination/pagination.component';
import { FooterComponent } from '../common/footer/footer.component';
import { SeoService } from '../common/seo.service';

type SortOption = 'default' | 'popular' | 'price-low' | 'price-high' | 'name';
const PAGE_SIZE = 50;
const MOBILE_PAGE_SIZE = 10;
// Same breakpoint the stylesheet's `@media (max-width: 560px)` rules use for the mobile layout
// (single-column grid, collapsed filters) — page size switches at the same width so "mobile" means
// one consistent thing across layout and pagination.
const MOBILE_BREAKPOINT = '(max-width: 560px)';

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

// Empty `selected` = no filter applied (show everything). Once a chip is active, a product matches
// if it's tagged with the selected value OR tagged 'All' — the same tri-state rule the backend's
// tagMatch() (product-item-query.ts) uses, and the one documented in docs/kit-results-admin-guide.md
// ("tag All to always include"). Mock mode's seed data represents "unrestricted" as an empty array
// instead of ['All'] (see product-catalog.ts), so this clause is simply never true there — no
// mock-mode behavior change, only real-backend mode, where ~60-70% of the catalog is 'All'-tagged
// and was previously vanishing the instant any chip was toggled on.
function matchesFilter<T extends string>(tags: readonly T[], selected: ReadonlySet<T>): boolean {
  if (selected.size === 0) return true;
  return tags.some((tag) => selected.has(tag) || tag === 'All');
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [FormsModule, PricePipe, RouterLink, PaginationComponent, FooterComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css',
})
export class ShopComponent implements OnInit {
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);

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

  // Mobile only (see the `@media (max-width: 560px)` rules in the stylesheet) — Sort/Season/
  // Destination collapse behind a "Filters" toggle under the search bar instead of eating a full
  // screen of vertical space before any results are visible. Desktop always shows them expanded;
  // this signal is simply irrelevant there (CSS never reads it outside the mobile breakpoint).
  protected readonly filtersOpen = signal(false);

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  // Drives the toggle button's badge so a shopper knows filters are active even while collapsed.
  protected readonly activeFilterCount = computed(() => {
    let count = this.seasons().size + this.destinations().size;
    if (this.sortBy() !== 'default') count += 1;
    return count;
  });

  // Filtering/sorting is instant client-side (no network round-trip), which reads as "did the
  // filter even register?" — this flashes a brief spinner over the grid so a filter/sort change
  // is visibly acknowledged even though there's nothing to actually wait for.
  protected readonly isRefreshing = signal(false);
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  private flashRefresh(): void {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
    this.isRefreshing.set(true);
    this.refreshTimeout = setTimeout(() => this.isRefreshing.set(false), 350);
  }

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

  // SSR-guarded (no `window` during prerender, same pattern as the localStorage-backed services) —
  // defaults to the desktop size there, then syncs to the real viewport once hydrated client-side.
  // matchMedia's `change` event (not a `window:resize` listener) so this only updates on an actual
  // mobile/desktop crossing, not on every pixel of a drag-resize.
  private readonly mobileQuery = typeof window !== 'undefined' ? window.matchMedia(MOBILE_BREAKPOINT) : null;
  protected readonly isMobile = signal(this.mobileQuery?.matches ?? false);
  protected readonly pageSize = computed(() => (this.isMobile() ? MOBILE_PAGE_SIZE : PAGE_SIZE));

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));

  // Clamps in the same read — a new search/filter narrowing the result set falls back to the new
  // last page instead of showing a blank grid.
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  protected readonly pagedItems = computed<ProductItemView[]>(() => {
    const size = this.pageSize();
    const start = this.currentPage() * size;
    return this.filtered().slice(start, start + size);
  });

  protected goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    // The one place that needs the whole catalog (browsing/search/filter) — everything else
    // (Product Detail, Cart, My Kit) either uses a targeted per-product fetch or triggers this
    // lazily itself only when it actually needs a cross-product lookup.
    this.productItems.ensureCatalogLoaded();

    this.mobileQuery?.addEventListener('change', (e) => this.isMobile.set(e.matches));

    this.seo.setSeo({
      title: 'Shop Travel Gear & Packing Essentials | Travel Besty',
      description:
        'Browse field-tested travel gear and packing essentials for beach, mountain, and city trips — filter by season, destination, and more.',
    });
  }

  ngOnInit(): void {
    // Seeds initial filter state from the URL — Home's "Shop by destination" chips/footer links
    // pass a single destination this way, and (below) any of these params reflected back by
    // syncUrl() round-trip correctly on a shared/bookmarked/reloaded link. Comma-separated so a
    // multi-select filter state (e.g. `?destination=Beach,Mountain`) is representable too.
    const qp = this.route.snapshot.queryParamMap;

    const destinationParam = qp.get('destination');
    if (destinationParam) {
      const values = destinationParam
        .split(',')
        .filter((v): v is ProductDestination => DESTINATION_OPTIONS.some((o) => o.value === v));
      if (values.length > 0) this.destinations.set(new Set(values));
    }

    const seasonParam = qp.get('season');
    if (seasonParam) {
      const values = seasonParam.split(',').filter((v): v is ProductSeason => SEASON_OPTIONS.some((o) => o.value === v));
      if (values.length > 0) this.seasons.set(new Set(values));
    }

    // My Kit's "Load more suggestions" link passes a product category through here — `filtered`
    // already matches search terms against category text, so pre-filling the search box is
    // enough to land the user on the full set of that category's products.
    const searchParam = qp.get('search');
    if (searchParam) {
      this.search.set(searchParam);
    }
  }

  // Mirrors destination/season/search into the URL (replacing, not pushing, history) so a
  // filtered view is a distinct, shareable, bookmarkable — and crawlable — link instead of
  // client-only state that vanishes on reload. Deliberately excludes sort/page, which aren't
  // meaningful "category" URLs the way destination/season/search are.
  private syncUrl(): void {
    const destinations = this.destinations();
    const seasons = this.seasons();
    const search = this.search().trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        destination: destinations.size > 0 ? [...destinations].join(',') : null,
        season: seasons.size > 0 ? [...seasons].join(',') : null,
        search: search || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0); // a new search invalidates whatever page the shopper was on
    this.flashRefresh();
    this.syncUrl();
  }

  // A re-sort reshuffles which items land on which page — without resetting to page 0, a shopper
  // sitting on page 2 who picks "Price: Low to High" lands on the *tail* of the new order (e.g.
  // just the single most expensive item), which reads as the sort being broken/backwards rather
  // than just being on the wrong page.
  protected setSortBy(value: SortOption): void {
    this.sortBy.set(value);
    this.page.set(0);
    this.flashRefresh();
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
    this.flashRefresh();
    this.syncUrl();
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
    this.flashRefresh();
    this.syncUrl();
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

import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { PricePipe } from '../common/price.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getProductTint } from './product-catalog';
import { ProductItemService, ProductItemView } from './product-item.service';
import { CartService } from '../cart/cart.service';
import { PaginationComponent } from '../common/pagination/pagination.component';
import { FooterComponent } from '../common/footer/footer.component';
import { SeoService } from '../common/seo.service';
import { JsonLdService } from '../common/json-ld.service';
import { organizationNode, websiteNode, breadcrumbNode } from '../common/site-entities';
import { MasterDataService } from '../common/master-data/master-data.service';

type SortOption = 'default' | 'popular' | 'price-low' | 'price-high' | 'name';
type ProductSeason = string;
type ProductDestination = string;
const PAGE_SIZE = 50;
const MOBILE_PAGE_SIZE = 10;
// Same breakpoint the stylesheet's `@media (max-width: 560px)` rules use for the mobile layout
// (single-column grid, collapsed filters) — page size switches at the same width so "mobile" means
// one consistent thing across layout and pagination.
const MOBILE_BREAKPOINT = '(max-width: 560px)';

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

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [FormsModule, PricePipe, RouterLink, PaginationComponent, FooterComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css',
})
export class ShopComponent {
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly masterData = inject(MasterDataService);

  protected readonly search = signal('');
  protected readonly seasons = signal<ReadonlySet<ProductSeason>>(new Set());
  protected readonly destinations = signal<ReadonlySet<ProductDestination>>(new Set());
  protected readonly sortBy = signal<SortOption>('default');
  protected readonly getProductTint = getProductTint;
  protected readonly addedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly page = signal(0); // 0-indexed

  // Sourced from the admin-editable Kit Settings master data (see MasterDataService), not
  // hardcoded — emoji comes off the master data row instead of a local map.
  protected readonly seasonOptions = computed(() =>
    this.masterData.forType('season').map((v) => ({ value: v.value, label: v.emoji ? `${v.emoji} ${v.value}` : v.value })),
  );
  protected readonly destinationOptions = computed(() =>
    this.masterData.forType('destination').map((v) => ({ value: v.value, label: v.emoji ? `${v.emoji} ${v.value}` : v.value })),
  );

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

  private readonly queryParamMap;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.queryParamMap = toSignal(this.route.queryParamMap);

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

    // Reactive: the catalog loads async (ensureCatalogLoaded() below), so this republishes once
    // real prices are in, and stays correct if the catalog changes later — lowPrice/highPrice are
    // computed live from the actual current catalog, never a hardcoded guess.
    effect(() => {
      const items = this.productItems.views();
      const prices = items.map((i) => i.price);
      const aggregateOfferNode: Record<string, unknown> = {
        '@type': 'AggregateOffer',
        priceCurrency: items[0]?.currency ?? 'USD',
        offerCount: items.length,
      };
      if (prices.length > 0) {
        aggregateOfferNode['lowPrice'] = Math.min(...prices);
        aggregateOfferNode['highPrice'] = Math.max(...prices);
      }

      this.jsonLd.set({
        '@context': 'https://schema.org',
        '@graph': [
          organizationNode(),
          websiteNode(),
          breadcrumbNode([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
          ]),
          aggregateOfferNode,
        ],
      });
    });

    // Reactive, not one-shot: Angular reuses this same component instance for navigations that
    // only change query params on an already-matched /shop route (e.g. clicking a footer/nav
    // destination or season link while already here), so a one-time ngOnInit read would seed the
    // filters correctly on first load and then silently stop working on every link after that —
    // the URL would update but the visible filter state wouldn't. This re-derives filter state
    // from the URL on every change, seeded from Home's "Shop by destination" chips, footer links,
    // My Kit's "Load more suggestions" search handoff, or a shared/bookmarked/reloaded link.
    // Comma-separated so a multi-select filter state (`?destination=Beach,Mountain`) round-trips.
    // Only writes a signal when the parsed value actually differs from current state, so this
    // can't loop with syncUrl()'s own (replaceUrl) navigations back into the same params.
    effect(() => {
      const qp = this.queryParamMap();
      if (!qp) return;

      const destinationParam = qp.get('destination');
      const validDestinations = this.destinationOptions();
      const nextDestinations = new Set(
        destinationParam
          ? destinationParam.split(',').filter((v): v is ProductDestination => validDestinations.some((o) => o.value === v))
          : [],
      );
      if (!setsEqual(nextDestinations, this.destinations())) this.destinations.set(nextDestinations);

      const seasonParam = qp.get('season');
      const validSeasons = this.seasonOptions();
      const nextSeasons = new Set(
        seasonParam
          ? seasonParam.split(',').filter((v): v is ProductSeason => validSeasons.some((o) => o.value === v))
          : [],
      );
      if (!setsEqual(nextSeasons, this.seasons())) this.seasons.set(nextSeasons);

      const searchParam = qp.get('search') ?? '';
      if (searchParam !== this.search()) this.search.set(searchParam);
    });
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

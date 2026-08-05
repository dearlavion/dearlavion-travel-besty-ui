import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../common/footer/footer.component';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { Product } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { PopularKitCard, toPopularKitCard } from './popular-kit-view';
import { buildTravelKit, Destination, Duration, Gender, Party, Season, Transportation } from './kit-recommendation';
import { TravelKitService } from './travel-kit.service';
import { PaginationComponent } from '../common/pagination/pagination.component';
import { environment } from '../../environments/environment';
import { SeoService } from '../common/seo.service';
import { JsonLdService } from '../common/json-ld.service';
import { organizationNode, websiteNode } from '../common/site-entities';
import { TaxonomyService } from '../common/taxonomy.service';

const TOTAL_STEPS = 9;
const AUTO_ADVANCE_DELAY_MS = 350;
const GALLERY_PAGE_SIZE = 10;

// 'All' is a UI-only sentinel — mutually exclusive with picking specific destinations (see
// toggleDestination()) and resolved to [] ("unrestricted", same convention product tags use)
// before being sent to buildTravelKit()/the backend. Never a real Destination value on its own,
// so it's never part of the admin-editable destination taxonomy either.
export type DestinationChoice = Destination | 'All';

// "beach", "beach and mountain", "beach, mountain, and city".
function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

interface KitChecklistItem {
  label: string;
  productId: string;
  productItemId?: string;
  sizeLabel?: string;
  category?: string;
}
interface SurveyRecommendationsResponse {
  checklist: KitChecklistItem[];
  products: Product[];
}

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [FormsModule, RouterLink, FooterComponent, PaginationComponent],
  templateUrl: './travel.component.html',
  styleUrl: './travel.component.css',
})
export class TravelComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly travelKitService = inject(TravelKitService);
  private readonly popularKitsService = inject(PopularKitsService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly taxonomy = inject(TaxonomyService);
  private readonly fragment = toSignal(this.route.fragment);

  constructor() {
    this.seo.setSeo({
      title: 'Build Your Travel Kit | Travel Besty',
      description:
        'Tell us your destination, season, and trip length — we\'ll build a personalized packing kit, or browse our Popular Kits gallery for ready-made picks.',
    });

    this.jsonLd.set({
      '@context': 'https://schema.org',
      '@graph': [organizationNode(), websiteNode()],
    });

    // Handled explicitly rather than via Angular Router's built-in anchor-scrolling: this route is
    // reused for both the footer's "Build My Kit" (/travel, no fragment) and "Popular Kits"
    // (/travel#popular-kits) links, and the router's automatic scroll restoration doesn't reliably
    // reset when navigating between two fragment states of the *same* already-active route — it
    // was leaving "Build My Kit" scrolled down at the gallery after a prior Popular Kits click.
    // Reacting to the fragment signal directly (only re-fires when it actually changes) fixes both
    // directions deterministically.
    effect(() => {
      const frag = this.fragment();
      if (typeof document === 'undefined') return;
      if (frag === 'popular-kits') {
        document.getElementById('popular-kits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Default target for "hero" or no fragment at all (nav bar / other plain /travel links).
        document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Real-backend mode only — mock mode's preview count/navigation both call the local
    // buildTravelKit() formula directly and never touch `recommendations`, so there's nothing to
    // prefetch. Refires whenever the answers that affect the backend's result change (including
    // partySize/activities, both sent in the request body) — see fetchRecommendations().
    if (!environment.useMockData) {
      effect(() => {
        const key = this.answersKey();
        if (!key || key === this.lastFetchedAnswersKey) return;
        this.lastFetchedAnswersKey = key;
        this.fetchRecommendations();
      });
    }
  }

  protected readonly step = signal(0);
  protected readonly totalSteps = TOTAL_STEPS;

  // The 8 question cards' order — admin-configurable via Kit Settings' drag-and-drop (see
  // TaxonomyService.axisOrder), so reordering sections there directly changes which question the
  // survey asks first. Reveal (the 9th/last card) isn't part of this — it always comes last.
  protected isActiveStep(axisKey: string): boolean {
    return this.taxonomy.axisOrder()[this.step()] === axisKey;
  }

  // Sourced from the admin-editable Kit Settings taxonomy (see TaxonomyService), not hardcoded.
  protected readonly destinationTaxonomy = computed(() => this.taxonomy.forAxis('destination'));
  protected readonly seasonTaxonomy = computed(() => this.taxonomy.forAxis('season'));
  // Fixed at exactly 3 rows (admin can rename value/subtext, not add/remove) — see Kit Settings.
  protected readonly durationTaxonomy = computed(() => this.taxonomy.forAxis('duration'));
  protected readonly partyTaxonomy = computed(() => this.taxonomy.forAxis('party'));
  protected readonly transportationTaxonomy = computed(() => this.taxonomy.forAxis('transportation'));
  protected readonly activityTaxonomy = computed(() => this.taxonomy.forAxis('activity'));
  protected readonly kitCategoryTaxonomy = computed(() => this.taxonomy.forAxis('kitCategory'));
  protected readonly genderTaxonomy = computed(() => this.taxonomy.forAxis('gender'));

  protected readonly destinations = signal<DestinationChoice[]>([]);
  protected readonly season = signal<Season | null>(null);
  protected readonly party = signal<Party | null>(null);
  protected readonly partySize = signal(2);
  // Holds Duration's stable code ('short'|'medium'|'long'), never the display label — see
  // kit-recommendation.ts's Duration type. durationLabel() below resolves it back to a label for
  // display text (revealSummary()).
  protected readonly duration = signal<Duration | null>(null);
  protected readonly durationLabel = computed(
    () => this.durationTaxonomy().find((d) => d.code === this.duration())?.value ?? '',
  );
  protected readonly transportation = signal<Transportation | null>(null);
  protected readonly activities = signal<string[]>([]);
  protected readonly priorityCategories = signal<string[]>([]);
  protected readonly gender = signal<Gender | null>(null);

  // Translates the UI's DestinationChoice[] (which may contain the 'All' sentinel) into the real
  // Destination[] the scoring engine and backend understand — 'All' (or nothing picked) becomes
  // [], "unrestricted", exactly like an unrestricted product's own Product.destinations: [].
  private resolvedDestinations(): Destination[] {
    const choices = this.destinations();
    if (choices.includes('All')) return [];
    return choices.filter((d): d is Destination => d !== 'All');
  }

  protected readonly revealSummary = computed(() => {
    const destinations = this.resolvedDestinations();
    const destPart = destinations.length
      ? `to the ${joinWithAnd(destinations.map((d) => d.toLowerCase()))}`
      : 'wherever the wind takes you';
    const season = this.season()?.toLowerCase() ?? '';
    // Strip a leading "A "/"a " so "A proper break" reads as "proper break trip", not the
    // grammatically broken "a proper break beach" the raw label would otherwise produce.
    const durationPhrase = this.durationLabel().toLowerCase().replace(/^a /, '');
    const partyPart = this.party() === 'Group' ? ` with ${this.partySize()} travelers` : '';
    const transport = this.transportation();
    const transportPart = transport ? `, traveling by ${transport.toLowerCase()}` : '';
    return `Built for your ${durationPhrase} ${season} trip ${destPart}${partyPart}${transportPart} — here's everything you'll need.`;
  });

  // Real-backend mode: the actual recommendation engine (POST /survey/recommendations) decides
  // both which items AND how many — it scores every real catalog product and stops once it either
  // hits its target size or runs out of eligible items, so the count is only knowable by actually
  // calling it. The old behavior showed a fixed local formula's count here (e.g. 21, from
  // kit-recommendation.ts's static tables) while `seeMyTravelKit()` below used the backend's own,
  // independently-sized result (e.g. 16) — two unrelated numbers that had no reason to agree.
  // Prefetching here and reusing the same response for both the preview and the actual navigation
  // guarantees they can never disagree again.
  private readonly recommendations = signal<SurveyRecommendationsResponse | null>(null);
  private lastFetchedAnswersKey: string | null = null;

  private answersKey(): string | null {
    const destinations = this.destinations();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    const transportation = this.transportation();
    const priorityCategories = this.priorityCategories();
    if (destinations.length === 0 || !season || !party || !duration || !transportation || priorityCategories.length === 0) {
      return null;
    }
    const partySize = party === 'Group' ? this.partySize() : undefined;
    return JSON.stringify({
      destinations: [...this.resolvedDestinations()].sort(),
      season,
      party,
      partySize,
      duration,
      transportation,
      priorityCategories: [...priorityCategories].sort(),
      activities: [...this.activities()].sort(),
      gender: this.gender(),
    });
  }

  private fetchRecommendations(): void {
    const destinations = this.destinations();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    const transportation = this.transportation();
    const priorityCategories = this.priorityCategories();
    if (destinations.length === 0 || !season || !party || !duration || !transportation || priorityCategories.length === 0) {
      return;
    }
    const partySize = party === 'Group' ? this.partySize() : undefined;
    this.http
      .post<SurveyRecommendationsResponse>(`${environment.apiUrl}/survey/recommendations`, {
        destinations: this.resolvedDestinations(),
        season,
        party,
        partySize,
        duration,
        transportation,
        priorityCategories,
        activities: this.activities(),
        gender: this.gender(),
      })
      .subscribe({
        next: (res) => this.recommendations.set(res),
        error: () => this.recommendations.set(null),
      });
  }

  protected readonly kitItemCount = computed(() => {
    if (!environment.useMockData) {
      return this.recommendations()?.checklist.length ?? null;
    }
    const destinations = this.destinations();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    const transportation = this.transportation();
    const priorityCategories = this.priorityCategories();
    if (destinations.length === 0 || !season || !party || !duration || !transportation || priorityCategories.length === 0) {
      return null;
    }
    return buildTravelKit({
      destinations: this.resolvedDestinations(),
      season,
      party,
      duration,
      transportation,
      priorityCategories,
      activities: this.activities(),
      gender: this.gender() ?? undefined,
    }).length;
  });

  protected isDestinationSelected(choice: DestinationChoice): boolean {
    return this.destinations().includes(choice);
  }

  // 'All' and specific picks are mutually exclusive: choosing 'All' clears any specific picks (and
  // vice versa) rather than letting them coexist, which would be redundant/ambiguous — "Beach +
  // All" doesn't mean anything more than "All" alone.
  protected toggleDestination(choice: DestinationChoice): void {
    this.destinations.update((list) => {
      if (choice === 'All') {
        return list.includes('All') ? [] : ['All'];
      }
      const withoutAll = list.filter((d) => d !== 'All');
      return withoutAll.includes(choice)
        ? withoutAll.filter((d) => d !== choice)
        : [...withoutAll, choice];
    });
  }

  protected continueFromDestinations(): void {
    this.goNext();
  }

  protected selectSeason(value: Season): void {
    this.season.set(value);
    this.autoAdvance();
  }

  protected selectParty(value: Party): void {
    this.party.set(value);
    if (value !== 'Group') {
      this.autoAdvance();
    }
  }

  protected continueFromParty(): void {
    this.goNext();
  }

  protected incrementPartySize(): void {
    this.partySize.update((size) => Math.min(size + 1, 12));
  }

  protected decrementPartySize(): void {
    this.partySize.update((size) => Math.max(size - 1, 2));
  }

  protected selectDuration(value: Duration): void {
    this.duration.set(value);
    this.autoAdvance();
  }

  protected selectTransportation(value: Transportation): void {
    this.transportation.set(value);
    this.autoAdvance();
  }

  protected isActivitySelected(activity: string): boolean {
    return this.activities().includes(activity);
  }

  protected toggleActivity(activity: string): void {
    this.activities.update((list) =>
      list.includes(activity) ? list.filter((a) => a !== activity) : [...list, activity],
    );
  }

  protected continueFromActivities(): void {
    this.goNext();
  }

  protected isPriorityCategorySelected(category: string): boolean {
    return this.priorityCategories().includes(category);
  }

  protected togglePriorityCategory(category: string): void {
    this.priorityCategories.update((list) =>
      list.includes(category) ? list.filter((c) => c !== category) : [...list, category],
    );
  }

  protected continueFromPriorityCategories(): void {
    this.goNext();
  }

  protected selectGender(value: Gender): void {
    this.gender.set(value);
    this.autoAdvance();
  }

  // Tile clicks always set their answer before calling autoAdvance(), and Party's Continue button
  // is only visible/clickable once Group is chosen — so this only matters for the one path that
  // had no answer check at all: the forward chevron, which otherwise lets a user click straight
  // through the whole wizard with every answer still null and land on a broken Reveal card.
  protected readonly canAdvanceFromStep = computed(() => {
    const axisKey = this.taxonomy.axisOrder()[this.step()];
    switch (axisKey) {
      case 'destination':
        return this.destinations().length > 0;
      case 'season':
        return this.season() !== null;
      case 'duration':
        return this.duration() !== null;
      case 'party':
        return this.party() !== null;
      case 'transportation':
        return this.transportation() !== null;
      case 'kitCategory':
        return this.priorityCategories().length > 0;
      default:
        return true; // Activities/Gender are optional; Reveal (beyond the 8-entry axisOrder) too
    }
  });

  protected goNext(): void {
    if (this.step() >= this.totalSteps - 1) return;
    if (!this.canAdvanceFromStep()) return;
    this.step.update((s) => s + 1);
  }

  protected goBack(): void {
    if (this.step() > 0) {
      this.step.update((s) => s - 1);
    }
  }

  protected seeMyTravelKit(): void {
    const destinations = this.destinations();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    const transportation = this.transportation();
    const priorityCategories = this.priorityCategories();
    if (destinations.length === 0 || !season || !party || !duration || !transportation || priorityCategories.length === 0) {
      return;
    }

    if (!environment.useMockData) {
      // Reuse the same response the reveal card's count came from — so the number the user just
      // saw and the kit they land on can never disagree. Only re-fetches if it's somehow missing
      // (e.g. the button was clicked before the prefetch settled).
      const cached = this.recommendations();
      if (cached && this.answersKey() === this.lastFetchedAnswersKey) {
        this.navigateToKit(cached);
        return;
      }
      const partySize = party === 'Group' ? this.partySize() : undefined;
      this.http
        .post<SurveyRecommendationsResponse>(`${environment.apiUrl}/survey/recommendations`, {
          destinations: this.resolvedDestinations(),
          season,
          party,
          partySize,
          duration,
          transportation,
          priorityCategories,
          activities: this.activities(),
          gender: this.gender(),
        })
        .subscribe({ next: (res) => this.navigateToKit(res), error: () => {} });
      return;
    }

    this.travelKitService.setKit({
      items: buildTravelKit({
        destinations: this.resolvedDestinations(),
        season,
        party,
        duration,
        transportation,
        priorityCategories,
        activities: this.activities(),
        gender: this.gender() ?? undefined,
      }),
      summary: this.revealSummary(),
    });
    this.router.navigate(['/my-kit']);
  }

  /** Real-backend mode: hand the recommendation engine's own checklist off to /my-kit — the
   * ranked, already-scored-and-sized result (size/variant resolved into productItemId). */
  private navigateToKit(res: SurveyRecommendationsResponse): void {
    this.travelKitService.setKit({
      items: res.checklist.map((c) => ({ label: c.label, productId: c.productId, productItemId: c.productItemId })),
      summary: this.revealSummary(),
    });
    this.router.navigate(['/my-kit']);
  }

  private autoAdvance(): void {
    setTimeout(() => this.goNext(), AUTO_ADVANCE_DELAY_MS);
  }

  // ── Popular Kits gallery — browsable alternative to the wizard above, sourced from the same
  // admin-curated PopularKitsService as the homepage marquee (via the shared popular-kit-view
  // helpers) so both surfaces always agree on a kit's contents. ──────────────────────────────────
  protected readonly gallerySearch = signal('');

  protected readonly popularKitCards = computed<PopularKitCard[]>(() =>
    this.popularKitsService
      .kits()
      .filter((kit) => kit.active !== false)
      .map((kit) => toPopularKitCard(kit, this.catalog)),
  );

  protected readonly filteredPopularKits = computed<PopularKitCard[]>(() => {
    const term = this.gallerySearch().trim().toLowerCase();
    const cards = this.popularKitCards();
    if (!term) return cards;
    return cards.filter((card) => card.name.toLowerCase().includes(term) || card.tag.toLowerCase().includes(term));
  });

  protected readonly galleryPage = signal(0); // 0-indexed

  protected readonly galleryTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPopularKits().length / GALLERY_PAGE_SIZE)),
  );

  // Clamps in the same read — a new search narrowing the result set falls back to the new last
  // page instead of showing a blank grid.
  protected readonly galleryCurrentPage = computed(() =>
    Math.min(this.galleryPage(), this.galleryTotalPages() - 1),
  );

  protected readonly pagedPopularKits = computed<PopularKitCard[]>(() => {
    const start = this.galleryCurrentPage() * GALLERY_PAGE_SIZE;
    return this.filteredPopularKits().slice(start, start + GALLERY_PAGE_SIZE);
  });

  protected setGallerySearch(term: string): void {
    this.gallerySearch.set(term);
    this.galleryPage.set(0); // a new search invalidates whatever page the visitor was on
  }

  protected goToGalleryPage(page: number): void {
    this.galleryPage.set(Math.max(0, Math.min(page, this.galleryTotalPages() - 1)));
  }
}

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
import { buildTravelKit, Destination, Duration, Party, Season } from './kit-recommendation';
import { TravelKitService } from './travel-kit.service';
import { PaginationComponent } from '../common/pagination/pagination.component';
import { environment } from '../../environments/environment';
import { SeoService } from '../common/seo.service';
import { JsonLdService } from '../common/json-ld.service';
import { organizationNode, websiteNode } from '../common/site-entities';

const TOTAL_STEPS = 6;
const AUTO_ADVANCE_DELAY_MS = 350;
const GALLERY_PAGE_SIZE = 10;

// Mirrors the backend ACTIVITIES taxonomy (store-engine product/taxonomy.ts). Multi-select, optional.
export const ACTIVITY_OPTIONS = [
  'Hiking',
  'Swimming',
  'Sightseeing',
  'Business',
  'Photography',
  'Nightlife',
  'Food',
  'Relaxing',
] as const;

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

  protected readonly destination = signal<Destination | null>(null);
  protected readonly season = signal<Season | null>(null);
  protected readonly party = signal<Party | null>(null);
  protected readonly partySize = signal(2);
  protected readonly duration = signal<Duration | null>(null);
  protected readonly activityOptions = ACTIVITY_OPTIONS;
  protected readonly activities = signal<string[]>([]);

  protected readonly revealSummary = computed(() => {
    const dest = this.destination()?.toLowerCase() ?? 'trip';
    const season = this.season()?.toLowerCase() ?? '';
    // Strip a leading "A "/"a " so "A proper break" reads as "proper break trip", not the
    // grammatically broken "a proper break beach" the raw label would otherwise produce.
    const durationPhrase = (this.duration() ?? '').toLowerCase().replace(/^a /, '');
    const partyPart = this.party() === 'Group' ? ` with ${this.partySize()} travelers` : '';
    return `Built for your ${durationPhrase} ${season} trip to the ${dest}${partyPart} — here's everything you'll need.`;
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
    const destination = this.destination();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    if (!destination || !season || !party || !duration) return null;
    const partySize = party === 'Group' ? this.partySize() : undefined;
    return JSON.stringify({ destination, season, party, partySize, duration, activities: [...this.activities()].sort() });
  }

  private fetchRecommendations(): void {
    const destination = this.destination();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    if (!destination || !season || !party || !duration) return;
    const partySize = party === 'Group' ? this.partySize() : undefined;
    this.http
      .post<SurveyRecommendationsResponse>(`${environment.apiUrl}/survey/recommendations`, {
        destination,
        season,
        party,
        partySize,
        duration,
        activities: this.activities(),
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
    const destination = this.destination();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    if (!destination || !season || !party || !duration) {
      return null;
    }
    return buildTravelKit({ destination, season, party, duration }).length;
  });

  protected selectDestination(value: Destination): void {
    this.destination.set(value);
    this.autoAdvance();
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

  // Tile clicks always set their answer before calling autoAdvance(), and Party's Continue button
  // is only visible/clickable once Group is chosen — so this only matters for the one path that
  // had no answer check at all: the forward chevron, which otherwise lets a user click straight
  // through the whole wizard with every answer still null and land on a broken Reveal card.
  protected readonly canAdvanceFromStep = computed(() => {
    switch (this.step()) {
      case 0:
        return this.destination() !== null;
      case 1:
        return this.season() !== null;
      case 2:
        return this.party() !== null;
      case 3:
        return this.duration() !== null;
      default:
        return true; // Activities (4) is optional; Reveal (5) is the last step
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
    const destination = this.destination();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    if (!destination || !season || !party || !duration) {
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
          destination,
          season,
          party,
          partySize,
          duration,
          activities: this.activities(),
        })
        .subscribe({ next: (res) => this.navigateToKit(res), error: () => {} });
      return;
    }

    this.travelKitService.setKit({
      items: buildTravelKit({ destination, season, party, duration }),
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

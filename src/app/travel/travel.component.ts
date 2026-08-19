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
import { KitAnswerSummary, TravelKitService } from './travel-kit.service';
import { PaginationComponent } from '../common/pagination/pagination.component';
import { environment } from '../../environments/environment';
import { ToastService } from '../common/toast/toast.service';
import { SeoService } from '../common/seo.service';
import { JsonLdService } from '../common/json-ld.service';
import { organizationNode, websiteNode } from '../common/site-entities';
import { MasterDataService } from '../common/master-data/master-data.service';

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
  private readonly toast = inject(ToastService);
  private readonly travelKitService = inject(TravelKitService);
  private readonly popularKitsService = inject(PopularKitsService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly masterData = inject(MasterDataService);
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
  // MasterDataService.typeOrder), so reordering sections there directly changes which question the
  // survey asks first. Reveal (the 9th/last card) isn't part of this — it always comes last.
  protected isActiveStep(axisKey: string): boolean {
    return this.masterData.typeOrder()[this.step()] === axisKey;
  }

  // Sourced from the admin-editable Kit Settings master data (see MasterDataService), not hardcoded.
  protected readonly destinationTaxonomy = computed(() => this.masterData.forType('destination'));
  protected readonly seasonTaxonomy = computed(() => this.masterData.forType('season'));
  // Fixed at exactly 4 rows (admin can rename value/subtext, not add/remove) — see Kit Settings.
  protected readonly durationTaxonomy = computed(() => this.masterData.forType('duration'));
  protected readonly partyTaxonomy = computed(() => this.masterData.forType('party'));
  protected readonly transportationTaxonomy = computed(() => this.masterData.forType('transportation'));
  protected readonly activityTaxonomy = computed(() => this.masterData.forType('activity'));
  protected readonly kitCategoryTaxonomy = computed(() => this.masterData.forType('kitCategory'));
  protected readonly genderTaxonomy = computed(() => this.masterData.forType('gender'));

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

  // Human-readable destination(s) for BuiltKit.destination (e.g. "Beach and Mountains") — used
  // by "Email my kit"'s subject line. Undefined for the unrestricted/"All" case, same as
  // resolvedDestinations()'s own [] convention.
  private destinationLabel(): string | undefined {
    const destinations = this.resolvedDestinations();
    return destinations.length ? joinWithAnd(destinations) : undefined;
  }

  /**
   * The answers as label/value pairs, in the order Kit Settings asks them, skipping anything left
   * unanswered — an optional question the shopper skipped isn't worth a row saying "none".
   */
  protected readonly answerSummary = computed<KitAnswerSummary[]>(() => {
    const party = this.party();
    const values: Record<string, string> = {
      destination: this.destinations().includes('All') ? 'Anywhere' : this.destinations().join(', '),
      season: this.season() ?? '',
      duration: this.durationLabel(),
      party: party === 'Group' ? `${party} of ${this.partySize()}` : (party ?? ''),
      transportation: this.transportation() ?? '',
      activity: this.activities().join(', '),
      kitCategory: this.priorityCategories().join(', '),
      gender: this.gender() ?? '',
    };
    const byKey = new Map(this.masterData.collections().map((c) => [c.key, c.label]));
    return this.masterData
      .typeOrder()
      .filter((key) => (values[key] ?? '').trim().length > 0)
      .map((key) => ({ label: byKey.get(key) ?? key, value: values[key] }));
  });

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
    if (this.missingAnswers().length > 0 || !season || !party || !duration) {
      return null;
    }
    const partySize = party === 'Group' ? this.partySize() : undefined;
    return JSON.stringify({
      destinations: [...this.resolvedDestinations()].sort(),
      season,
      party,
      partySize,
      duration,
      transportation: transportation ?? undefined,
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
    // Silent: this runs while the shopper is still answering, so an incomplete survey is normal.
    if (this.missingAnswers().length > 0 || !season || !party || !duration) return;
    const partySize = party === 'Group' ? this.partySize() : undefined;
    this.http
      .post<SurveyRecommendationsResponse>(`${environment.apiUrl}/survey/recommendations`, {
        destinations: this.resolvedDestinations(),
        season,
        party,
        partySize,
        duration,
        transportation: transportation ?? undefined,
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
    if (this.missingAnswers().length > 0 || !season || !party || !duration) {
      return null;
    }
    return buildTravelKit({
      destinations: this.resolvedDestinations(),
      season,
      party,
      duration,
      transportation: transportation ?? undefined,
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
    this.autoAdvance(); // no-op unless an admin has set Destination to a single answer
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
  /** The collection this step is asking about, or '' for the Reveal card past the 8 questions. */
  protected readonly currentAxisKey = computed(() => this.masterData.typeOrder()[this.step()] ?? '');

  /** How many answers this question currently holds, whichever signal happens to store them. */
  private answerCountFor(axisKey: string): number {
    switch (axisKey) {
      case 'destination':
        return this.destinations().length;
      case 'season':
        return this.season() ? 1 : 0;
      case 'duration':
        return this.duration() ? 1 : 0;
      case 'party':
        return this.party() ? 1 : 0;
      case 'transportation':
        return this.transportation() ? 1 : 0;
      case 'activity':
        return this.activities().length;
      case 'kitCategory':
        return this.priorityCategories().length;
      case 'gender':
        return this.gender() ? 1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Driven by admin Kit Settings (/admin/kit-settings) rather than a hardcoded per-axis switch: a
   * question marked Optional can always be skipped, a Required one needs at least one answer. The
   * Reveal card past the last question has no axis, so it always passes.
   */
  protected readonly canAdvanceFromStep = computed(() => {
    const axisKey = this.currentAxisKey();
    if (!axisKey) return true;
    if (!this.masterData.settingsFor(axisKey).required) return true;
    return this.answerCountFor(axisKey) > 0;
  });

  /**
   * Single-answer questions move on by themselves once picked, so Next is just a fallback there;
   * multi-answer questions must wait, or picking the first option would cut the shopper off before
   * they can choose a second. Also admin-driven, so flipping Selection on Kit Settings changes
   * which questions advance on their own.
   */
  protected readonly showNextButton = computed(() => {
    const axisKey = this.currentAxisKey();
    if (!axisKey) return false; // Reveal card has its own CTA
    return this.masterData.settingsFor(axisKey).multiple || !this.masterData.settingsFor(axisKey).required;
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

  /**
   * What the shopper still has to answer. Driven by Kit Settings rather than a fixed list — a
   * question marked Optional there can be skipped past by the Next button, so blocking submit on
   * it silently strands them on the reveal card with a button that does nothing.
   *
   * <p>season/party/duration are the exception: the survey endpoint rejects them as blank, and the
   * engine treats season and party as hard filters and duration as the kit's size, so there's no
   * neutral value to send. They stay required whatever Kit Settings says.
   */
  private static readonly ALWAYS_REQUIRED = ['season', 'party', 'duration'];

  protected readonly missingAnswers = computed<string[]>(() => {
    const answered: Record<string, boolean> = {
      destination: this.destinations().length > 0,
      season: !!this.season(),
      duration: !!this.duration(),
      party: !!this.party(),
      transportation: !!this.transportation(),
      activity: this.activities().length > 0,
      kitCategory: this.priorityCategories().length > 0,
      gender: !!this.gender(),
    };
    const labelFor = (key: string) =>
      this.masterData.collections().find((c) => c.label && c.key === key)?.label ?? key;
    return this.masterData
      .typeOrder()
      .filter(
        (key) =>
          (TravelComponent.ALWAYS_REQUIRED.includes(key) || this.masterData.settingsFor(key).required) &&
          answered[key] === false,
      )
      .map(labelFor);
  });

  protected seeMyTravelKit(): void {
    const destinations = this.destinations();
    const season = this.season();
    const party = this.party();
    const duration = this.duration();
    const transportation = this.transportation();
    const priorityCategories = this.priorityCategories();
    const missing = this.missingAnswers();
    if (missing.length > 0 || !season || !party || !duration) {
      // Was a bare `return`, so an unanswered optional question left the button dead with no
      // explanation. Say what's missing instead.
      this.toast.show(`Answer ${missing.join(', ') || 'every question'} to build your kit`, 'error');
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
          // Optional now: the engine treats a missing transport as a neutral soft boost.
          transportation: transportation ?? undefined,
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
        transportation: transportation ?? undefined,
        priorityCategories,
        activities: this.activities(),
        gender: this.gender() ?? undefined,
      }),
      summary: this.revealSummary(),
      answers: this.answerSummary(),
      destination: this.destinationLabel(),
    });
    this.router.navigate(['/my-kit']);
  }

  /** Real-backend mode: hand the recommendation engine's own checklist off to /my-kit — the
   * ranked, already-scored-and-sized result (size/variant resolved into productItemId). */
  private navigateToKit(res: SurveyRecommendationsResponse): void {
    this.travelKitService.setKit({
      items: res.checklist.map((c) => ({ label: c.label, productId: c.productId, productItemId: c.productItemId })),
      summary: this.revealSummary(),
      answers: this.answerSummary(),
      destination: this.destinationLabel(),
    });
    this.router.navigate(['/my-kit']);
  }

  private autoAdvance(): void {
    // Multi-answer questions must not jump ahead on the first pick — see showNextButton().
    if (this.masterData.settingsFor(this.currentAxisKey()).multiple) return;
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

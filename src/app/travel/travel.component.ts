import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../common/footer/footer.component';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { Product } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { PopularKitCard, toPopularKitCard } from './popular-kit-view';
import { buildTravelKit, Destination, Duration, Party, Season } from './kit-recommendation';
import { TravelKitService } from './travel-kit.service';
import { environment } from '../../environments/environment';

const TOTAL_STEPS = 5;
const AUTO_ADVANCE_DELAY_MS = 350;

interface SurveyRecommendationsResponse {
  products: Product[];
}

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [FormsModule, RouterLink, FooterComponent],
  templateUrl: './travel.component.html',
  styleUrl: './travel.component.css',
})
export class TravelComponent {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly travelKitService = inject(TravelKitService);
  private readonly popularKitsService = inject(PopularKitsService);
  private readonly catalog = inject(ProductCatalogService);

  protected readonly step = signal(0);
  protected readonly totalSteps = TOTAL_STEPS;

  protected readonly destination = signal<Destination | null>(null);
  protected readonly season = signal<Season | null>(null);
  protected readonly party = signal<Party | null>(null);
  protected readonly partySize = signal(2);
  protected readonly duration = signal<Duration | null>(null);

  protected readonly revealSummary = computed(() => {
    const dest = this.destination()?.toLowerCase() ?? 'trip';
    const dur = this.duration()?.toLowerCase() ?? '';
    const partyPart = this.party() === 'Group' ? ` with ${this.partySize()} travelers` : '';
    return `Built for your ${dur} ${dest}${partyPart} — here's everything you'll need.`;
  });

  protected readonly kitItemCount = computed(() => {
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

  protected goNext(): void {
    if (this.step() < this.totalSteps - 1) {
      this.step.update((s) => s + 1);
    }
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
      const partySize = party === 'Group' ? this.partySize() : undefined;
      this.http
        .post<SurveyRecommendationsResponse>(`${environment.apiUrl}/survey/recommendations`, {
          destination,
          season,
          party,
          partySize,
          duration,
        })
        .subscribe((res) => {
          this.travelKitService.setKit({
            items: res.products.map((p) => ({ label: p.name, productId: p.id })),
            summary: this.revealSummary(),
          });
          this.router.navigate(['/my-kit']);
        });
      return;
    }

    this.travelKitService.setKit({
      items: buildTravelKit({ destination, season, party, duration }),
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
}

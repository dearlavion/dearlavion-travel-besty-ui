import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { buildTravelKit, Destination, Duration, Party, Season } from './kit-recommendation';
import { TravelKitService } from './travel-kit.service';

const TOTAL_STEPS = 5;
const AUTO_ADVANCE_DELAY_MS = 350;

@Component({
  selector: 'app-travel',
  standalone: true,
  templateUrl: './travel.component.html',
  styleUrl: './travel.component.css',
})
export class TravelComponent {
  private readonly router = inject(Router);
  private readonly travelKitService = inject(TravelKitService);

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

    this.travelKitService.setKit({
      items: buildTravelKit({ destination, season, party, duration }),
      summary: this.revealSummary(),
    });
    this.router.navigate(['/my-kit']);
  }

  private autoAdvance(): void {
    setTimeout(() => this.goNext(), AUTO_ADVANCE_DELAY_MS);
  }
}

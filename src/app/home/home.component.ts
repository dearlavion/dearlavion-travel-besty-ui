import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FooterComponent } from '../common/footer/footer.component';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { KitItem, TripAnswers } from '../travel/kit-recommendation';
import { TravelKitService } from '../travel/travel-kit.service';
import { ProductCatalogService } from '../shop/product-catalog.service';

interface Step {
  num: string;
  title: string;
  text: string;
}

interface KitCard {
  id: string;
  image: string;
  name: string;
  tag: string;
  meta: string;
  answers: TripAnswers;
  productIds: string[];
}

interface CategoryChip {
  icon: string;
  label: string;
  destination: string | null;
}

interface HeroGalleryItem {
  image: string;
  label: string;
}

interface BagItem {
  label: string;
  bg: string;
  icon: SafeHtml;
}

interface BagItemLayout extends BagItem {
  top: number;
  left: number;
  delay: number;
}

// Items sit at exactly equal distance from the bag's center, evenly spaced by
// angle — a fixed, perfectly circular arrangement rather than a random scatter.
// The stage is a square (see .bag-stage aspect-ratio in the CSS), so a single
// radius percentage is the same number of pixels on both axes, keeping the
// ring an actual circle instead of an ellipse.
const RING_RADIUS = 34;
const RING_START_ANGLE = -90; // first item straight up, rest follow clockwise

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router,
    private readonly travelKitService: TravelKitService,
    private readonly popularKitsService: PopularKitsService,
    private readonly catalog: ProductCatalogService,
  ) {
    this.bagItems = this.buildBagItems();
    this.bagLayout = signal(this.buildLayout());
  }

  protected readonly bagOpen = signal(false);
  protected readonly bagItems: BagItem[];
  protected readonly bagLayout;

  protected toggleBag(): void {
    this.bagOpen.set(!this.bagOpen());
  }

  protected onBagSpace(event: Event): void {
    event.preventDefault();
    this.toggleBag();
  }

  private buildLayout(): BagItemLayout[] {
    const step = 360 / this.bagItems.length;

    return this.bagItems.map((item, i) => {
      const angle = ((RING_START_ANGLE + i * step) * Math.PI) / 180;
      return {
        ...item,
        left: 50 + RING_RADIUS * Math.cos(angle),
        top: 50 + RING_RADIUS * Math.sin(angle),
        delay: i * 70,
      };
    });
  }

  private trust(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  private buildBagItems(): BagItem[] {
    return [
      {
        label: 'Emergency Kit',
        bg: 'var(--tint-pink)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <rect x="14" y="24" width="36" height="28" rx="6" fill="#fff" stroke="#E38B4E" stroke-width="3" />
            <path d="M24 24v-4a8 8 0 0 1 16 0v4" fill="none" stroke="#E38B4E" stroke-width="3" />
            <rect x="28" y="30" width="8" height="16" fill="#E38B4E" />
            <rect x="22" y="36" width="20" height="8" fill="#E38B4E" />
          </svg>
        `),
      },
      {
        label: 'Toothbrush',
        bg: 'var(--tint-cream)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <g transform="rotate(-30 32 32)">
              <rect x="8" y="28" width="36" height="8" rx="4" fill="#B695C4" />
              <rect x="42" y="23" width="15" height="18" rx="4" fill="#fff" stroke="#B695C4" stroke-width="2" />
              <line x1="45.5" y1="26" x2="45.5" y2="38" stroke="#B695C4" stroke-width="2" />
              <line x1="49.5" y1="26" x2="49.5" y2="38" stroke="#B695C4" stroke-width="2" />
              <line x1="53.5" y1="26" x2="53.5" y2="38" stroke="#B695C4" stroke-width="2" />
            </g>
          </svg>
        `),
      },
      {
        label: 'Slippers',
        bg: 'var(--tint-yellow)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <ellipse cx="20" cy="40" rx="13" ry="19" fill="#F2AE3E" />
            <path d="M20 23 L12 34 M20 23 L28 34" stroke="#33502F" stroke-width="3" stroke-linecap="round" fill="none" />
            <ellipse cx="46" cy="40" rx="13" ry="19" fill="#F2AE3E" />
            <path d="M46 23 L38 34 M46 23 L54 34" stroke="#33502F" stroke-width="3" stroke-linecap="round" fill="none" />
          </svg>
        `),
      },
      {
        label: 'Sunblock',
        bg: 'var(--tint-green)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <rect x="24" y="12" width="16" height="8" rx="2" fill="#6E9B5C" />
            <rect x="19" y="20" width="26" height="34" rx="7" fill="#EBF2E4" stroke="#6E9B5C" stroke-width="2" />
            <circle cx="32" cy="38" r="6" fill="#F2AE3E" />
            <g stroke="#F2AE3E" stroke-width="2" stroke-linecap="round">
              <line x1="32" y1="27" x2="32" y2="24" />
              <line x1="41" y1="38" x2="44" y2="38" />
              <line x1="23" y1="38" x2="20" y2="38" />
              <line x1="38.5" y1="31.5" x2="40.5" y2="29.5" />
              <line x1="25.5" y1="31.5" x2="23.5" y2="29.5" />
            </g>
          </svg>
        `),
      },
      {
        label: 'Whistle',
        bg: 'var(--tint-pink)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <rect x="32" y="26" width="22" height="16" rx="6" fill="#E38B4E" />
            <circle cx="24" cy="34" r="14" fill="#F4CBDA" stroke="#E38B4E" stroke-width="3" />
            <circle cx="24" cy="34" r="5" fill="#E38B4E" />
          </svg>
        `),
      },
      {
        label: 'Rubber Shoes',
        bg: 'var(--tint-cream)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <rect x="14" y="10" width="16" height="8" fill="#33502F" />
            <path d="M14 14h16v22c0 4 3 7 8 7h18v11H14z" fill="#6E9B5C" />
          </svg>
        `),
      },
      {
        label: 'Sunglasses',
        bg: 'var(--tint-yellow)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <path d="M5 30 L1 26 M59 30 L63 26" stroke="#33502F" stroke-width="3" stroke-linecap="round" fill="none" />
            <rect x="27" y="30" width="10" height="5" rx="2" fill="#33502F" />
            <circle cx="18" cy="34" r="13" fill="#33502F" />
            <circle cx="46" cy="34" r="13" fill="#33502F" />
            <circle cx="18" cy="34" r="8" fill="#B695C4" opacity="0.55" />
            <circle cx="46" cy="34" r="8" fill="#B695C4" opacity="0.55" />
          </svg>
        `),
      },
      {
        label: 'Bug Spray',
        bg: 'var(--tint-green)',
        icon: this.trust(`
          <svg viewBox="0 0 64 64">
            <rect x="24" y="26" width="16" height="30" rx="4" fill="#EBF2E4" stroke="#6E9B5C" stroke-width="2" />
            <rect x="27" y="14" width="10" height="12" rx="2" fill="#6E9B5C" />
            <rect x="34" y="9" width="12" height="6" rx="2" fill="#33502F" transform="rotate(30 34 9)" />
          </svg>
        `),
      },
    ];
  }

  protected readonly steps: Step[] = [
    {
      num: 'One',
      title: 'Tell us about your trip',
      text: "Destination, season, who's coming, how long — a short, story-like flow, not a form.",
    },
    {
      num: 'Two',
      title: 'We build your kit',
      text: 'Your answers bloom into a personalized list of exactly what this trip needs — nothing extra.',
    },
    {
      num: 'Three',
      title: 'Pack and go',
      text: 'Every item field-tested. Order the whole kit at once, or pick and choose from the list.',
    },
  ];

  protected readonly trustPills = ['Field-tested items', '4,200+ kits built', 'One-stop essentials'];

  // hero3.png is pending — drop it into public/homepage/ once it's ready.
  protected readonly heroGalleryItems: HeroGalleryItem[] = [
    { image: 'homepage/hero2.png', label: 'Beach Kit' },
    { image: 'homepage/hero3.jpg', label: 'Mountain Ready Kit' },
    { image: 'homepage/hero1.png', label: 'Hello New York' },
  ];

  // Sourced from PopularKitsService (admin-editable, localStorage-backed) rather than hardcoded
  // here — admins curate this "Popular kits" collection, including its exact product list, from
  // /admin/popular-kits. `answers` (destination/season/party/duration) is cosmetic-only now —
  // it just feeds the "Built for your ... trip" summary text; the actual contents come entirely
  // from `productIds`, so `meta`'s item count can never drift out of sync with what the kit
  // actually opens to.
  protected readonly kitCards = computed<KitCard[]>(() =>
    this.popularKitsService.kits().map((kit) => {
      const answers: TripAnswers = {
        destination: kit.destination,
        season: kit.season,
        party: kit.party,
        duration: kit.duration,
      };
      const linkedCount = kit.productIds.filter((id) => this.catalog.getById(id)).length;
      return {
        id: kit.id,
        image: kit.image,
        name: kit.name,
        tag: kit.tag,
        answers,
        productIds: kit.productIds,
        meta: `${linkedCount} items · ${kit.tag}`,
      };
    }),
  );

  // Doubled so the marquee's translateX(-50%) keyframe lands exactly on a repeat of the
  // original set, making the loop seamless instead of jumping/blanking at the restart.
  protected readonly kitCardsLoop = computed<KitCard[]>(() => [...this.kitCards(), ...this.kitCards()]);

  protected readonly categoryChips: CategoryChip[] = [
    { icon: '🏖️', label: 'Beach', destination: 'Beach' },
    { icon: '⛰️', label: 'Mountain', destination: 'Mountain' },
    { icon: '🏙️', label: 'City', destination: 'City' },
    { icon: '🧳', label: 'Group Travel', destination: null },
  ];

  // Same TravelKitService the quiz's reveal step uses — populating it here before navigating
  // means /my-kit renders through the exact same @if(kit(); as builtKit) path either way.
  protected viewKit(kit: KitCard): void {
    const { destination, season, party, duration } = kit.answers;
    const partyPart = party === 'Group' ? ' with the group' : '';
    // Duration labels ("A proper break") read as standalone answer choices, not clause
    // fragments — drop a leading "a " so it doesn't collide with the "your" already in front.
    const durationPhrase = duration.toLowerCase().replace(/^a /, '');
    // Skip any productId whose product has since been deleted from the catalog rather than
    // showing a broken entry with no name/price/image.
    const items: KitItem[] = kit.productIds
      .map((id) => this.catalog.getById(id))
      .filter((product) => !!product)
      .map((product) => ({ label: product.name, productId: product.id }));
    this.travelKitService.setKit({
      items,
      summary: `Built for your ${durationPhrase} ${season.toLowerCase()} trip to the ${destination.toLowerCase()}${partyPart} — here's everything you'll need.`,
      title: kit.name,
    });
    this.router.navigateByUrl('/my-kit');
  }
}

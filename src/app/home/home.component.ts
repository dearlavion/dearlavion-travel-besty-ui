import { afterNextRender, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../common/footer/footer.component';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { PopularKitCard, toPopularKitCard } from '../travel/popular-kit-view';
import { TopSellingService } from './top-selling.service';

interface Step {
  num: string;
  title: string;
  text: string;
}

interface CategoryChip {
  icon: string;
  label: string;
  destination: string | null;
}

interface BagItemLayout {
  label: string;
  bg: string;
  icon: string;
  productId: string;
  productItemId: string;
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
const BAG_ITEM_COUNT = 8;
// Cycled per item, same tint palette used elsewhere (My Kit's pastel item cards) — real products
// don't carry a "bag illustration" background of their own.
const BAG_TINTS = [
  'var(--tint-pink)',
  'var(--tint-cream)',
  'var(--tint-yellow)',
  'var(--tint-green)',
  'var(--tint-lavender)',
  'var(--tint-marigold)',
  'var(--tint-blue)',
  'var(--tint-violet)',
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly topSelling = inject(TopSellingService);

  constructor(
    private readonly popularKitsService: PopularKitsService,
    private readonly catalog: ProductCatalogService,
  ) {
    this.topSelling.load(BAG_ITEM_COUNT);

    afterNextRender(() => {
      this.measureMarquee();
      window.addEventListener('resize', () => this.measureMarquee());
      requestAnimationFrame((t) => this.runMarqueeLoop(t));
    });
  }

  protected readonly bagOpen = signal(false);

  // Real top-selling items, laid out around the bag ring — see BAG_ITEM_COUNT/BAG_TINTS above.
  protected readonly bagLayout = computed<BagItemLayout[]>(() => {
    const items = this.topSelling.items();
    const step = items.length > 0 ? 360 / items.length : 0;
    return items.map((item, i) => {
      const angle = ((RING_START_ANGLE + i * step) * Math.PI) / 180;
      return {
        label: item.name,
        bg: BAG_TINTS[i % BAG_TINTS.length],
        icon: item.icon ?? '🧳',
        productId: item.productId,
        productItemId: item.productItemId,
        left: 50 + RING_RADIUS * Math.cos(angle),
        top: 50 + RING_RADIUS * Math.sin(angle),
        delay: i * 70,
      };
    });
  });

  protected toggleBag(): void {
    this.bagOpen.set(!this.bagOpen());
  }

  protected onBagSpace(event: Event): void {
    event.preventDefault();
    this.toggleBag();
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

  // Sourced from PopularKitsService (admin-editable, localStorage-backed) via the shared
  // toPopularKitCard() helper — also used by TravelComponent's gallery — rather than hardcoded
  // here. Admins curate this "Popular kits" collection, including its exact product list, from
  // /admin/popular-kits.
  protected readonly kitCards = computed<PopularKitCard[]>(() =>
    this.popularKitsService
      .kits()
      .filter((kit) => kit.active !== false)
      .map((kit) => toPopularKitCard(kit, this.catalog)),
  );

  // The hero's crossfading photo carousel — real popular kits (image + name), each a clickable
  // link to /popular/:id, instead of the old static hero1/2/3 stock photos. The crossfade timing
  // (see gallery-fade in the stylesheet) is tuned for exactly 3 evenly-staggered slides.
  protected readonly heroKits = computed<PopularKitCard[]>(() => this.kitCards().slice(0, 3));

  // Doubled so that once `offset` wraps past one full set's width, the duplicated second set is
  // already sitting in view — the wrap-to-0 reset lands on an identical-looking frame instead of
  // jumping/blanking.
  protected readonly kitCardsLoop = computed<PopularKitCard[]>(() => [...this.kitCards(), ...this.kitCards()]);

  // ── Popular-kits marquee: auto-scrolls continuously (JS rAF loop, not CSS @keyframes, so the
  // arrow/dot controls below can nudge the same position the autoplay is animating) ─────────────
  protected readonly trackRef = viewChild<ElementRef<HTMLDivElement>>('track');
  protected readonly offset = signal(0);
  protected readonly paused = signal(false);
  private cardStep = 0; // one card's width + gap, in px — measured from the live DOM
  private loopWidth = 0; // width of one full (non-doubled) set of cards
  private lastFrameTime = 0;

  protected readonly activeKitIndex = computed(() => {
    // Read `offset()` unconditionally (before any early return) so this computed always
    // registers it as a dependency — otherwise the very first evaluation (which hits the
    // `!this.cardStep` guard before `measureMarquee()` has run) would never read `offset()` at
    // all, and later `offset` changes wouldn't invalidate this computed's cached `0`.
    const offset = this.offset();
    const count = this.kitCards().length;
    if (!count || !this.cardStep) return 0;
    return Math.round(offset / this.cardStep) % count;
  });

  private measureMarquee(): void {
    const track = this.trackRef()?.nativeElement;
    const firstCard = track?.children[0] as HTMLElement | undefined;
    if (!track || !firstCard) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    this.cardStep = firstCard.getBoundingClientRect().width + gap;
    this.loopWidth = this.cardStep * this.kitCards().length;
  }

  private runMarqueeLoop(time: number): void {
    if (this.lastFrameTime && !this.paused() && this.loopWidth > 0) {
      const deltaSeconds = (time - this.lastFrameTime) / 1000;
      const pxPerSecond = this.loopWidth / 32; // full loop every ~32s, matching the old CSS pace
      this.offset.update((current) => {
        const next = current + pxPerSecond * deltaSeconds;
        return next >= this.loopWidth ? next - this.loopWidth : next;
      });
    }
    this.lastFrameTime = time;
    requestAnimationFrame((t) => this.runMarqueeLoop(t));
  }

  private wrapOffsetBy(delta: number): void {
    if (!this.loopWidth) return;
    this.offset.update((current) => {
      const next = (current + delta) % this.loopWidth;
      return next < 0 ? next + this.loopWidth : next;
    });
  }

  protected nudgeMarquee(direction: 1 | -1): void {
    if (!this.cardStep) return;
    this.wrapOffsetBy(direction * this.cardStep);
  }

  protected jumpToKit(index: number): void {
    if (!this.cardStep) return;
    this.offset.set(index * this.cardStep);
  }

  // Lets a mouse wheel or trackpad gesture over the carousel drive it directly, instead of
  // scrolling the page — autoplay is already paused by the (mouseenter) handler on
  // `.kits-marquee` for the whole time the cursor is here, so no separate pause bookkeeping is
  // needed. Trackpad users mostly send deltaX; plain mouse wheels send deltaY — whichever axis
  // has the bigger magnitude wins, so both gestures feel natural.
  protected onKitsWheel(event: WheelEvent): void {
    if (!this.loopWidth) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    this.wrapOffsetBy(delta);
  }

  protected readonly categoryChips: CategoryChip[] = [
    { icon: '🏖️', label: 'Beach', destination: 'Beach' },
    { icon: '⛰️', label: 'Mountain', destination: 'Mountain' },
    { icon: '🏙️', label: 'City', destination: 'City' },
    { icon: '🧳', label: 'Group Travel', destination: null },
  ];
}

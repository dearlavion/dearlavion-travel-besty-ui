import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../common/footer/footer.component';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { PopularKitCard, toPopularKitCard } from '../travel/popular-kit-view';

// Placeholder until there's a real pop-up address to show — swap for the real one when it exists,
// the map embed below reads from this constant so it updates automatically.
const FIND_US_ADDRESS = '123 Placeholder Ave, Suite 100, Somewhere, ST 00000';

interface Testimonial {
  quote: string;
  name: string;
  trip: string;
  avatarUrl: string;
}

interface ValueCard {
  icon: string;
  title: string;
  text: string;
}

// avatarUrl: i.pravatar.cc — a public placeholder-photo service, deterministic per `?img=N`
// (1-70), no API key needed. Stand-ins until there are real customer photos.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I answered four questions and had my whole beach kit sorted in like two minutes. Didn't forget a single thing for once.",
    name: 'Maya R.',
    trip: 'Solo, 5-day beach trip',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
  },
  {
    quote:
      'The rain jacket alone saved our trip. Everything in the kit actually got used — nothing felt like filler.',
    name: 'Jonah & Priya',
    trip: 'Group, 2-week city trip',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
  },
  {
    quote:
      "Packed for a month-long trip in one sitting. The packing cubes and laundry sheets were a genius add I never would've thought of.",
    name: 'Leo T.',
    trip: 'Solo, 3-week mountain trip',
    avatarUrl: 'https://i.pravatar.cc/150?img=33',
  },
  {
    quote:
      'It genuinely felt like a friend packed for me. My kit showed up and every single item made sense for the trip I was actually taking.',
    name: 'Sofia G.',
    trip: 'Group, weekend mountain trip',
    avatarUrl: 'https://i.pravatar.cc/150?img=47',
  },
  {
    quote:
      "I'm the world's worst packer and this made me look like I had it all together. Ordering again for our next trip already.",
    name: 'Aiko N.',
    trip: 'Solo, 4-day city trip',
    avatarUrl: 'https://i.pravatar.cc/150?img=65',
  },
];

const VALUES: ValueCard[] = [
  {
    icon: '🧪',
    title: 'Field-tested, always',
    text: 'Every item is tested on real trips before it ever makes it into a kit. No guessing, no filler.',
  },
  {
    icon: '💛',
    title: 'Made like a favor, not a form',
    text: "We build every kit like we're packing for a friend — not filling out a checkout cart.",
  },
  {
    icon: '🌍',
    title: 'Built for how you actually travel',
    text: 'Solo or in a group, three days or three weeks — your kit adjusts to your real trip, not a generic one.',
  },
];

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {
  private readonly popularKitsService = inject(PopularKitsService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    // Same continuous-marquee setup as the homepage's Popular Kits section — measure card width
    // once the track has rendered, then drive the auto-scroll with a rAF loop (see
    // home.component.ts's runMarqueeLoop, copied here verbatim).
    afterNextRender(() => {
      this.measureKitsMarquee();
      window.addEventListener('resize', () => this.measureKitsMarquee());
      requestAnimationFrame((t) => this.runKitsMarqueeLoop(t));
    });
  }

  protected readonly testimonials = TESTIMONIALS;
  protected readonly values = VALUES;

  // Key-less Google Maps embed (maps.google.com/maps?...&output=embed) — no API key needed for a
  // basic embedded map. Built only from the fixed FIND_US_ADDRESS constant above, never from
  // user input, before it reaches bypassSecurityTrustResourceUrl — same pattern as the YouTube
  // video embeds on Product Detail (see product-detail.component.ts).
  protected readonly findUsMapUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `https://maps.google.com/maps?q=${encodeURIComponent(FIND_US_ADDRESS)}&output=embed`,
  );

  // Same "Popular kits" source and crossfading hero visual as the homepage — real kits stand in
  // as proof of what we actually build, rather than stock/illustrated imagery.
  protected readonly kitCards = computed<PopularKitCard[]>(() =>
    this.popularKitsService
      .kits()
      .filter((kit) => kit.active !== false)
      .map((kit) => toPopularKitCard(kit, this.catalog)),
  );
  protected readonly heroKits = computed<PopularKitCard[]>(() => this.kitCards().slice(0, 3));

  // ── "Popular Kits"-styled marquee, now showing testimonials — same box shape/mechanic as the
  // homepage's Popular Kits section (home.component.ts), quote standing in for the kit photo and
  // name/trip/stars standing in for the kit name/meta. Field names kept as "kits*" since the CSS
  // shape (.kits-section/.kit-card/etc.) is unchanged, only the data source moved to testimonials. ─
  protected readonly kitsTrackRef = viewChild<ElementRef<HTMLDivElement>>('kitsTrack');
  protected readonly kitsOffset = signal(0);
  protected readonly kitsPaused = signal(false);
  private kitsCardStep = 0;
  private kitsLoopWidth = 0;
  private kitsLastFrameTime = 0;

  // Doubled so that once `kitsOffset` wraps past one full set's width, the duplicated second set
  // is already sitting in view — the wrap-to-0 reset lands on an identical-looking frame instead
  // of jumping/blanking.
  protected readonly testimonialCardsLoop = computed<Testimonial[]>(() => [...this.testimonials, ...this.testimonials]);

  protected readonly activeKitIndex = computed(() => {
    const offset = this.kitsOffset();
    const count = this.testimonials.length;
    if (!count || !this.kitsCardStep) return 0;
    return Math.round(offset / this.kitsCardStep) % count;
  });

  private measureKitsMarquee(): void {
    const track = this.kitsTrackRef()?.nativeElement;
    const firstCard = track?.children[0] as HTMLElement | undefined;
    if (!track || !firstCard) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    this.kitsCardStep = firstCard.getBoundingClientRect().width + gap;
    this.kitsLoopWidth = this.kitsCardStep * this.testimonials.length;
  }

  private runKitsMarqueeLoop(time: number): void {
    if (this.kitsLastFrameTime && !this.kitsPaused() && this.kitsLoopWidth > 0) {
      const deltaSeconds = (time - this.kitsLastFrameTime) / 1000;
      const pxPerSecond = this.kitsLoopWidth / 32;
      this.kitsOffset.update((current) => {
        const next = current + pxPerSecond * deltaSeconds;
        return next >= this.kitsLoopWidth ? next - this.kitsLoopWidth : next;
      });
    }
    this.kitsLastFrameTime = time;
    requestAnimationFrame((t) => this.runKitsMarqueeLoop(t));
  }

  private wrapKitsOffsetBy(delta: number): void {
    if (!this.kitsLoopWidth) return;
    this.kitsOffset.update((current) => {
      const next = (current + delta) % this.kitsLoopWidth;
      return next < 0 ? next + this.kitsLoopWidth : next;
    });
  }

  protected nudgeKitsMarquee(direction: 1 | -1): void {
    if (!this.kitsCardStep) return;
    this.wrapKitsOffsetBy(direction * this.kitsCardStep);
  }

  protected jumpToKit(index: number): void {
    if (!this.kitsCardStep) return;
    this.kitsOffset.set(index * this.kitsCardStep);
  }

  protected onKitsWheel(event: WheelEvent): void {
    if (!this.kitsLoopWidth) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    this.wrapKitsOffsetBy(delta);
  }
}

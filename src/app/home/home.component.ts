import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FooterComponent } from '../common/footer/footer.component';

interface Step {
  num: string;
  title: string;
  text: string;
}

interface KitCard {
  image: string;
  name: string;
  meta: string;
}

interface CategoryChip {
  icon: string;
  label: string;
  destination: string | null;
}

interface BagItem {
  label: string;
  bg: string;
  icon: SafeHtml;
}

interface BagSlot {
  top: number;
  left: number;
}

interface BagItemLayout extends BagItem {
  top: number;
  left: number;
  delay: number;
}

// Loose, non-overlapping anchor points across the bag stage — jittered and
// shuffled onto items each time the bag opens so the scatter reads as random
// without items ever colliding.
const BAG_SLOTS: BagSlot[] = [
  { top: 6, left: 14 },
  { top: 4, left: 64 },
  { top: 40, left: 4 },
  { top: 42, left: 78 },
  { top: 72, left: 22 },
  { top: 70, left: 58 },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  constructor(private readonly sanitizer: DomSanitizer) {
    this.bagItems = this.buildBagItems();
    this.bagLayout = signal(this.shuffleLayout());
  }

  protected readonly bagOpen = signal(false);
  protected readonly bagItems: BagItem[];
  protected readonly bagLayout;

  protected toggleBag(): void {
    const opening = !this.bagOpen();
    if (opening) {
      this.bagLayout.set(this.shuffleLayout());
    }
    this.bagOpen.set(opening);
  }

  protected onBagSpace(event: Event): void {
    event.preventDefault();
    this.toggleBag();
  }

  private shuffleLayout(): BagItemLayout[] {
    const slots = [...BAG_SLOTS];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    return this.bagItems.map((item, i) => ({
      ...item,
      top: slots[i].top + (Math.random() * 8 - 4),
      left: slots[i].left + (Math.random() * 8 - 4),
      delay: i * 70,
    }));
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
    ];
  }

  protected readonly steps: Step[] = [
    {
      num: 'One',
      title: 'Tell us your trip',
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

  // Dummy photos until real kit imagery is in the media store — seeded so each card stays stable across reloads.
  protected readonly kitCards: KitCard[] = [
    {
      image: 'https://picsum.photos/seed/beach-essentials/600/420',
      name: 'Beach Essentials',
      meta: '14 items · warm climates',
    },
    {
      image: 'https://picsum.photos/seed/backpacker-kit/600/420',
      name: 'Backpacker Kit',
      meta: '22 items · long stays',
    },
    {
      image: 'https://picsum.photos/seed/winter-city-break/600/420',
      name: 'Winter City Break',
      meta: '18 items · short stays',
    },
    {
      image: 'https://picsum.photos/seed/group-travel-bundle/600/420',
      name: 'Group Travel Bundle',
      meta: '30 items · 2–6 people',
    },
  ];

  // Doubled so the marquee's translateX(-50%) keyframe lands exactly on a repeat of the
  // original set, making the loop seamless instead of jumping/blanking at the restart.
  protected readonly kitCardsLoop: KitCard[] = [...this.kitCards, ...this.kitCards];

  protected readonly categoryChips: CategoryChip[] = [
    { icon: '🏖️', label: 'Beach', destination: 'Beach' },
    { icon: '⛰️', label: 'Mountain', destination: 'Mountain' },
    { icon: '🏙️', label: 'City', destination: 'City' },
    { icon: '🧳', label: 'Group Travel', destination: null },
  ];
}

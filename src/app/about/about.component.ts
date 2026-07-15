import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../common/footer/footer.component';

interface Testimonial {
  bg: string;
  avatarBg: string;
  initial: string;
  quote: string;
  name: string;
  trip: string;
}

interface ValueCard {
  icon: string;
  title: string;
  text: string;
}

interface WorkItem {
  num: string;
  title: string;
  text: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    bg: '#FF9EB0',
    avatarBg: '#D94A64',
    initial: 'M',
    quote:
      "I answered four questions and had my whole beach kit sorted in like two minutes. Didn't forget a single thing for once.",
    name: 'Maya R.',
    trip: 'Solo, 5-day beach trip',
  },
  {
    bg: '#6EC6E8',
    avatarBg: '#185FA5',
    initial: 'J',
    quote:
      'The rain jacket alone saved our trip. Everything in the kit actually got used — nothing felt like filler.',
    name: 'Jonah & Priya',
    trip: 'Group, 2-week city trip',
  },
  {
    bg: '#FFDD57',
    avatarBg: '#C08A3E',
    initial: 'L',
    quote:
      "Packed for a month-long trip in one sitting. The packing cubes and laundry sheets were a genius add I never would've thought of.",
    name: 'Leo T.',
    trip: 'Solo, 3-week mountain trip',
  },
  {
    bg: '#5CD9A6',
    avatarBg: '#4F7A42',
    initial: 'S',
    quote:
      'It genuinely felt like a friend packed for me. My kit showed up and every single item made sense for the trip I was actually taking.',
    name: 'Sofia G.',
    trip: 'Group, weekend mountain trip',
  },
  {
    bg: '#C792EA',
    avatarBg: '#7F5A9E',
    initial: 'A',
    quote:
      "I'm the world's worst packer and this made me look like I had it all together. Ordering again for our next trip already.",
    name: 'Aiko N.',
    trip: 'Solo, 4-day city trip',
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

const WORK_ITEMS: WorkItem[] = [
  {
    num: '01',
    title: 'Every item, field-tested',
    text: "No cheap materials, no guessing — everything's tried on real trips first.",
  },
  {
    num: '02',
    title: 'Built for your exact trip',
    text: "Not a generic bundle — your kit adjusts to destination, season, and who's coming.",
  },
  {
    num: '03',
    title: 'One place for everything',
    text: 'No more five tabs open trying to remember what you forgot last time.',
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
  @ViewChild('track') private trackRef?: ElementRef<HTMLDivElement>;

  protected readonly testimonials = TESTIMONIALS;
  protected readonly values = VALUES;
  protected readonly workItems = WORK_ITEMS;
  protected readonly activeTestimonial = signal(0);

  protected onTrackScroll(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll<HTMLElement>('.t-card'));
    let closest = 0;
    let minDist = Infinity;
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    this.activeTestimonial.set(closest);
  }

  protected scrollToTestimonial(index: number): void {
    const track = this.trackRef?.nativeElement;
    const card = track?.querySelectorAll<HTMLElement>('.t-card')[index];
    card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  protected scrollTestimonials(direction: 'back' | 'fwd'): void {
    const track = this.trackRef?.nativeElement;
    track?.scrollBy({ left: direction === 'fwd' ? 320 : -320, behavior: 'smooth' });
  }
}

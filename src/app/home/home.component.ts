import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
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

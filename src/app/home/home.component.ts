import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Step {
  num: string;
  title: string;
  text: string;
}

interface KitCard {
  thumbClass: string;
  icon: string;
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
  imports: [RouterLink],
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

  protected readonly kitCards: KitCard[] = [
    { thumbClass: 'beach', icon: '🏖️', name: 'Beach Essentials', meta: '14 items · warm climates' },
    { thumbClass: 'mountain', icon: '⛰️', name: 'Backpacker Kit', meta: '22 items · long stays' },
    { thumbClass: 'city', icon: '🏙️', name: 'Winter City Break', meta: '18 items · short stays' },
    { thumbClass: 'group', icon: '🧳', name: 'Group Travel Bundle', meta: '30 items · 2–6 people' },
  ];

  protected readonly categoryChips: CategoryChip[] = [
    { icon: '🏖️', label: 'Beach', destination: 'Beach' },
    { icon: '⛰️', label: 'Mountain', destination: 'Mountain' },
    { icon: '🏙️', label: 'City', destination: 'City' },
    { icon: '🧳', label: 'Group Travel', destination: null },
  ];
}

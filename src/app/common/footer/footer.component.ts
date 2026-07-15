import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

// Shared across Home and About — identical link structure in both mockups, only the closing
// tagline differs per page ("Freshly gathered for every trip." vs "Packed with a little bit
// of love for airplanes."), so that's the one thing left as an @Input.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  @Input() tagline = '';
}

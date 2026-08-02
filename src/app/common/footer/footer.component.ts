import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NewsletterService } from '../../my-kit/newsletter.service';

// Shared across every page — identical link structure and closing tagline everywhere, so both
// live here rather than being re-passed (and easy to forget, or drift) at each call site.
// Four columns: Shop (destination + season filter links — real, distinct, crawlable /shop views,
// the single highest-value internal-linking lever available in this app), Explore, Company, and a
// newsletter signup reusing the existing NewsletterService (already backed by a real endpoint and
// already used by My Kit's PDF-download opt-in popup) — a standard marketing-footer element that
// costs nothing new on the backend.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  protected readonly newsletter = inject(NewsletterService);

  protected readonly tagline = '© 2026 Travel Besty. Personalized travel essentials for every trip.';
  protected readonly email = signal('');

  protected subscribe(): void {
    const value = this.email().trim();
    if (!value) return;
    this.newsletter.subscribe(value).subscribe();
    this.email.set('');
  }
}

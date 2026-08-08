import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NewsletterService } from '../../my-kit/newsletter.service';
import { ToastService } from '../toast/toast.service';

// Shared across every page — identical link structure and closing tagline everywhere, so both
// live here rather than being re-passed (and easy to forget, or drift) at each call site.
// Four columns: Shop (destination + season filter links — real, distinct, crawlable /shop views,
// the single highest-value internal-linking lever available in this app), Explore, Company, and a
// newsletter signup reusing the existing NewsletterService (already backed by a real endpoint and
// already used by My Kit's PDF-download opt-in popup) — a standard marketing-footer element that
// costs nothing new on the backend.
const CONFIRMATION_MS = 5000;

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  protected readonly newsletter = inject(NewsletterService);
  private readonly toast = inject(ToastService);

  protected readonly tagline = '© 2026 Travel Besty. Personalized travel essentials for every trip.';
  protected readonly email = signal('');
  protected readonly submitting = signal(false);
  // Transient — separate from newsletter.subscribed() (which persists across visits so the My Kit
  // popup knows not to ask again). This only drives the footer's own "✓ You're subscribed" line,
  // which should fade back to the normal copy after a few seconds rather than replacing the input
  // permanently — the input/button stay usable the whole time either way.
  protected readonly justSubscribed = signal(false);
  private confirmationTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected subscribe(): void {
    const value = this.email().trim();
    if (!value || this.submitting()) return;

    this.submitting.set(true);
    this.newsletter.subscribe(value).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.email.set('');
        this.toast.success(
          res.alreadySubscribed
            ? "You're already subscribed!"
            : 'Thanks for subscribing! Check your inbox.',
        );

        if (this.confirmationTimeoutId) clearTimeout(this.confirmationTimeoutId);
        this.justSubscribed.set(true);
        this.confirmationTimeoutId = setTimeout(() => this.justSubscribed.set(false), CONFIRMATION_MS);
      },
      error: () => {
        // Leave the typed email in place so retrying doesn't mean retyping it — the input/button
        // were never hidden on failure to begin with.
        this.submitting.set(false);
        this.toast.error("Couldn't subscribe right now — please try again.");
      },
    });
  }
}

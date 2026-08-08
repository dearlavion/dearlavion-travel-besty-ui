import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'travel-besty-newsletter-subscribed';
const SUBSCRIBE_URL = `${environment.apiUrl}/newsletter/subscribe`;

export interface NewsletterSubscribeResponse {
  subscribed: true;
  // True when this email was already on the list — store-engine's subscribe() upserts atomically
  // and reports whether it inserted a new row, so a repeat subscribe never re-sends the "thanks
  // for subscribing" email, and the caller can show a different message for it.
  alreadySubscribed: boolean;
}

// SSR prerenders pages and Node has no localStorage — same guard as every other browser-only
// signal-backed service in this app (CartService, ProductCatalogService, etc.).
function loadSubscribed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Optional email opt-in, currently offered from My Kit's "Download PDF" action and the footer.
 * Mock mode just remembers locally that this browser opted in (no shared backend to actually
 * notify); real mode posts to the public, unauthenticated newsletter endpoint, which sends a
 * thank-you email for a genuinely new subscriber. `subscribed` only flips to true on an actual
 * success response — never optimistically — so a failed request doesn't lie about the outcome.
 */
@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);

  // Once true (this browser already subscribed), the popup shouldn't ask again.
  readonly subscribed = signal(loadSubscribed());

  subscribe(email: string): Observable<NewsletterSubscribeResponse> {
    if (environment.useMockData) {
      // No shared backend to check a real subscriber list against — approximate
      // "alreadySubscribed" as "this browser already opted in before", the only notion of
      // subscriber history mock mode has.
      const response: NewsletterSubscribeResponse = { subscribed: true, alreadySubscribed: this.subscribed() };
      this.markSubscribed();
      return of(response);
    }
    return this.http
      .post<NewsletterSubscribeResponse>(SUBSCRIBE_URL, { email })
      .pipe(tap(() => this.markSubscribed()));
  }

  private markSubscribed(): void {
    this.subscribed.set(true);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, 'true');
  }
}

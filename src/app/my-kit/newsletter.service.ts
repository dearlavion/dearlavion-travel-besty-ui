import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'travel-besty-newsletter-subscribed';
const SUBSCRIBE_URL = `${environment.apiUrl}/newsletter/subscribe`;

// SSR prerenders pages and Node has no localStorage — same guard as every other browser-only
// signal-backed service in this app (CartService, ProductCatalogService, etc.).
function loadSubscribed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Optional email opt-in, currently offered from My Kit's "Download PDF" action. Mock mode just
 * remembers locally that this browser opted in (no shared backend to actually notify); real mode
 * posts to the public, unauthenticated newsletter endpoint.
 */
@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);

  // Once true (this browser already subscribed), the popup shouldn't ask again.
  readonly subscribed = signal(loadSubscribed());

  subscribe(email: string): Observable<unknown> {
    this.subscribed.set(true);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, 'true');

    if (environment.useMockData) return of({ subscribed: true });
    return this.http.post(SUBSCRIBE_URL, { email });
  }
}

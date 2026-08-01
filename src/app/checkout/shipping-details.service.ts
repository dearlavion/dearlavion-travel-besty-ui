import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

export interface ShippingDetails {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
}

const STORAGE_KEY = 'travel-besty-shipping-details';
const API_BASE = `${environment.apiUrl}/shipping-details`;

function loadStored(): ShippingDetails | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ShippingDetails;
  } catch {
    return null;
  }
}

/** The caller's opt-in saved shipping details (checkbox at checkout) — used to prefill future
 * checkouts. Mirrors ProfileService's mock/real split, but with no fabricated default: unlike a
 * display name/avatar, there's no sensible non-empty address to default to, so `details()` stays
 * `null` until the shopper has actually saved one. Only ever injected from CheckoutComponent,
 * which is login-gated, so a token is always present by construction time. */
@Injectable({ providedIn: 'root' })
export class ShippingDetailsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly details = signal<ShippingDetails | null>(environment.useMockData ? loadStored() : null);

  constructor() {
    if (!environment.useMockData && this.auth.token()) {
      this.http
        .get<ShippingDetails | null>(API_BASE)
        .subscribe({ next: (res) => this.details.set(res), error: () => {} });
    }
  }

  save(patch: ShippingDetails): void {
    if (!environment.useMockData) {
      this.details.set(patch);
      this.http.put<ShippingDetails>(API_BASE, patch).subscribe({ next: (res) => this.details.set(res), error: () => {} });
      return;
    }

    this.details.set(patch);
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.details()));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { BASE_CURRENCY, DEFAULT_RATES } from './currency';

export interface RatesView {
  base: string;
  rates: Record<string, number>;
}

const STORAGE_KEY = 'travel-besty-exchange-rates';
const PUBLIC_BASE = `${environment.apiUrl}/exchange-rates`;
const ADMIN_BASE = `${environment.apiUrl}/admin/exchange-rates`;

function loadStored(): Record<string, number> {
  if (typeof window === 'undefined') return { ...DEFAULT_RATES };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_RATES };
  try {
    return { ...DEFAULT_RATES, ...(JSON.parse(raw) as Record<string, number>) };
  } catch {
    return { ...DEFAULT_RATES };
  }
}

/**
 * Holds the "units per 1 USD" rate table used to convert catalog prices into the shopper's
 * currency. Seeded with DEFAULT_RATES (so conversion works during SSR/first paint), then refreshed
 * from GET /exchange-rates in real-backend mode. Admins edit it via the dashboard (updateRates).
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly base = BASE_CURRENCY;
  readonly rates = signal<Record<string, number>>(environment.useMockData ? loadStored() : { ...DEFAULT_RATES });

  constructor() {
    // Rates are public; load the live table in real-backend mode.
    if (!environment.useMockData) {
      this.http.get<RatesView>(PUBLIC_BASE).subscribe({ next: (r) => this.rates.set(r.rates), error: () => {} });
    }
  }

  /** Rate (units per 1 USD) for a target currency; falls back to 1 (treat as base) if unknown. */
  rateFor(currency: string): number {
    return this.rates()[currency] ?? DEFAULT_RATES[currency] ?? 1;
  }

  /** Admin: persist new rates. Mock mode saves to localStorage; real mode PUTs to the backend. */
  updateRates(rates: Record<string, number>): Observable<RatesView> | void {
    if (!environment.useMockData) {
      return this.http.put<RatesView>(ADMIN_BASE, { rates }).pipe(tap((r) => this.rates.set(r.rates)));
    }
    const next = { ...this.rates(), ...rates, USD: 1 };
    this.rates.set(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StoreSettings {
  freeShippingMinimum: number; // in the base currency (USD); 0 = no threshold
}

const STORAGE_KEY = 'travel-besty-store-settings';
const PUBLIC_BASE = `${environment.apiUrl}/store-settings`;
const ADMIN_BASE = `${environment.apiUrl}/admin/store-settings`;
const DEFAULTS: StoreSettings = { freeShippingMinimum: 0 };

function loadStored(): StoreSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<StoreSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Store-wide settings (e.g. the free-shipping threshold). Public GET /store-settings backs the
 * storefront; admins edit via the dashboard. Mock mode is localStorage-backed, same pattern as
 * ExchangeRateService.
 */
@Injectable({ providedIn: 'root' })
export class StoreSettingsService {
  private readonly http = inject(HttpClient);

  readonly settings = signal<StoreSettings>(environment.useMockData ? loadStored() : { ...DEFAULTS });

  /** Free-shipping threshold in the base currency (USD). 0 = no free-shipping threshold. */
  readonly freeShippingMinimum = computed(() => this.settings().freeShippingMinimum);

  constructor() {
    if (!environment.useMockData) {
      this.http
        .get<StoreSettings>(PUBLIC_BASE)
        .subscribe({ next: (s) => this.settings.set({ ...DEFAULTS, ...s }), error: () => {} });
    }
  }

  /** Admin: persist settings. Mock mode saves to localStorage; real mode PUTs to the backend. */
  update(patch: Partial<StoreSettings>): Observable<StoreSettings> | void {
    if (!environment.useMockData) {
      return this.http.put<StoreSettings>(ADMIN_BASE, patch).pipe(tap((s) => this.settings.set({ ...DEFAULTS, ...s })));
    }
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

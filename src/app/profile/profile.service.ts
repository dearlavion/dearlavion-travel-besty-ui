import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

export interface UserProfile {
  displayName: string;
  avatar: string; // emoji
  currency: string; // ISO 4217, preferred display currency (default USD)
}

const STORAGE_KEY = 'travel-besty-profile';
const API_BASE = `${environment.apiUrl}/profile`;

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Traveler',
  avatar: '🧳',
  currency: 'USD',
};

// Mock mode: no real auth/user accounts — purely cosmetic, localStorage-backed. Real-backend
// mode: GET/PUT /profile (auth-scoped to whichever dev-auth-stub identity is logged in).
function loadStored(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PROFILE;
  try {
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly profile = signal<UserProfile>(environment.useMockData ? loadStored() : DEFAULT_PROFILE);

  /** The user's preferred currency (ISO 4217) — read by price displays / checkout / payments. */
  readonly currency = computed(() => this.profile().currency);

  constructor() {
    // /profile is auth-guarded — skip the request when logged out (guaranteed 403 otherwise) and
    // always attach an error handler, since an unhandled subscribe error becomes an uncaught
    // exception rather than just a rejected promise.
    if (!environment.useMockData && this.auth.token()) {
      this.http.get<UserProfile>(API_BASE).subscribe({ next: (res) => this.profile.set(res), error: () => {} });
    }
  }

  update(patch: Partial<UserProfile>): void {
    if (!environment.useMockData) {
      this.profile.update((p) => ({ ...p, ...patch }));
      this.http.put<UserProfile>(API_BASE, patch).subscribe({ next: (res) => this.profile.set(res), error: () => {} });
      return;
    }

    this.profile.update((p) => ({ ...p, ...patch }));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile()));
  }
}

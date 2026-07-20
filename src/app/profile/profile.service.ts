import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface UserProfile {
  displayName: string;
  avatar: string; // emoji
}

const STORAGE_KEY = 'travel-besty-profile';
const API_BASE = `${environment.apiUrl}/profile`;

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Traveler',
  avatar: '🧳',
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

  readonly profile = signal<UserProfile>(environment.useMockData ? loadStored() : DEFAULT_PROFILE);

  constructor() {
    if (!environment.useMockData) {
      this.http.get<UserProfile>(API_BASE).subscribe((res) => this.profile.set(res));
    }
  }

  update(patch: Partial<UserProfile>): void {
    if (!environment.useMockData) {
      this.profile.update((p) => ({ ...p, ...patch }));
      this.http.put<UserProfile>(API_BASE, patch).subscribe((res) => this.profile.set(res));
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

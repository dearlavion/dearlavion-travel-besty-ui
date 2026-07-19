import { Injectable, signal } from '@angular/core';

export interface UserProfile {
  displayName: string;
  avatar: string; // emoji
}

const STORAGE_KEY = 'travel-besty-profile';

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Traveler',
  avatar: '🧳',
};

// This app has no real auth/user accounts (login is fully mocked) — this is a purely cosmetic,
// localStorage-backed "profile" so the dashboard sidebar has something real to show/edit.
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
  readonly profile = signal<UserProfile>(loadStored());

  update(patch: Partial<UserProfile>): void {
    this.profile.update((p) => ({ ...p, ...patch }));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile()));
  }
}

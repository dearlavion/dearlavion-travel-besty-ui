import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'travel-besty-auth-token';

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
}

// Real-backend mode auth. There's no real password login wired up yet — the store-engine backend
// delegates all JWT verification to a separate auth-service this app doesn't talk to directly, so
// for local dev this instead talks to store-engine's bundled dev-auth-stub
// (scripts/dev-auth-stub.js, POST /auth/verify on :8099), which "verifies" any token shaped
// `tok:<userId>:<username>` to that identity. loginAs() just picks which stub identity to become.
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(loadStoredToken());
  readonly user = signal<AuthUser | null>(decodeStubToken(loadStoredToken()));

  loginAs(userId: string, username: string): void {
    const token = `tok:${userId}:${username}`;
    this.token.set(token);
    this.user.set({ userId, username, email: `${username}@example.com` });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, token);
    }
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  isAdmin(): boolean {
    return this.user()?.username === 'admin';
  }
}

function loadStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function decodeStubToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const match = /^tok:([^:]+):(.+)$/.exec(token);
  if (!match) return null;
  return { userId: match[1], username: match[2], email: `${match[2]}@example.com` };
}

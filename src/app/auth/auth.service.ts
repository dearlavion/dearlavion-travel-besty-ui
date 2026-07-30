import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'travel-besty-auth-token';
const USER_KEY = 'travel-besty-auth-user';

/** Roles (auth-service `activeProfile`) that grant admin access — mirrors store-engine's ADMIN_ROLES. */
const ADMIN_ROLES = new Set(['ADMIN', 'STAFF']);

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  role?: string; // auth-service activeProfile
}

/** Shape of auth-service-v2's POST /auth/login response. */
interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    activeProfile?: string;
  };
}

/** Shape of auth-service-v2's POST /auth/register response — no token, just a confirmation. */
interface RegisterResponse {
  message: string;
  user: string;
}

/**
 * Real-backend mode (yarn start:dev): logs in against auth-service-v2 (POST /auth/login), stores
 * the issued JWT, and sends it as a Bearer token to store-engine (via authInterceptor).
 * store-engine verifies it against the same auth-service and reads the role for admin access.
 *
 * Mock mode (yarn start): no backend — loginAs() fabricates a local stub identity so the app is
 * usable offline.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(loadStoredToken());
  readonly user = signal<AuthUser | null>(loadStoredUser());

  // One auth instance serves many customers; every auth call identifies this app's tenant.
  private readonly tenantHeaders = { 'X-Customer': environment.customer };

  // Route prefixes that require a session (mirror the requireLoginGuard routes). A cross-tab
  // logout / downgrade while sitting on one of these bumps the tab back to /login.
  private static readonly PROTECTED_PREFIXES = ['/admin', '/profile'];

  constructor() {
    // Cross-tab consistency: `storage` fires in OTHER tabs when localStorage changes. Since the
    // token/user keys are shared by every tab of this origin, re-seed the in-memory signals from
    // storage whenever they change elsewhere, so all tabs converge on the latest login/logout
    // (one identity everywhere) instead of drifting until a reload.
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => this.onExternalStorageChange(e));
    }
  }

  /** Reconcile this tab's session with a change made in another tab. */
  private onExternalStorageChange(e: StorageEvent): void {
    // React only to our auth keys, or a full clear (`key === null`); ignore unrelated keys.
    if (e.key !== null && e.key !== TOKEN_KEY && e.key !== USER_KEY) return;

    this.token.set(loadStoredToken());
    this.user.set(loadStoredUser());

    // setSession writes two keys in sequence; skip the brief window where the token landed but the
    // user object hasn't yet — the follow-up event finalizes it — to avoid a spurious redirect.
    if (this.token() && !this.user()) return;

    // If the new (or absent) identity can't be on the current protected page, send it to /login.
    const url = this.router.url.split('?')[0];
    const onProtected = AuthService.PROTECTED_PREFIXES.some((p) => url === p || url.startsWith(p + '/'));
    if (!onProtected) return;
    const lostAccess = !this.token() || (url.startsWith('/admin') && !this.isAdmin());
    if (lostAccess) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
    }
  }

  /** Real login against auth-service-v2. Accepts a username or email as the identifier. */
  login(identifier: string, password: string): Observable<LoginResponse> {
    const body = identifier.includes('@') ? { email: identifier, password } : { username: identifier, password };
    return this.http.post<LoginResponse>(`${environment.authUrl}/auth/login`, body, { headers: this.tenantHeaders }).pipe(
      tap((res) => {
        const user: AuthUser = {
          userId: res.user.id,
          username: res.user.username,
          email: res.user.email,
          role: res.user.activeProfile,
        };
        this.setSession(res.token, user);
      }),
    );
  }

  /** Real registration against auth-service-v2. Doesn't establish a session — caller navigates
   * to /login afterward (register returns a confirmation, not a token). To grant admin, a user's
   * activeProfile must be set to BUSINESS_OWNER/STAFF (store-engine authorizes admin by role). */
  register(username: string, email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${environment.authUrl}/auth/register`,
      { username, email, password },
      { headers: this.tenantHeaders },
    );
  }

  /** Mock-mode only: become a local stub identity without any backend call. */
  loginAs(userId: string, username: string, role = 'USER'): void {
    this.setSession(`tok:${userId}:${username}`, {
      userId,
      username,
      email: `${username}@example.com`,
      role,
    });
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
  }

  isAdmin(): boolean {
    const role = this.user()?.role;
    return (role != null && ADMIN_ROLES.has(role)) || this.user()?.username === 'admin';
  }

  private setSession(token: string, user: AuthUser): void {
    this.token.set(token);
    this.user.set(user);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }
}

function loadStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function loadStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      /* fall through */
    }
  }
  // Back-compat: older sessions stored only a `tok:<userId>:<username>` stub token, no user object.
  const match = /^tok:([^:]+):(.+)$/.exec(loadStoredToken() ?? '');
  return match ? { userId: match[1], username: match[2], email: `${match[2]}@example.com` } : null;
}

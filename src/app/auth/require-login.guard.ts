import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Gates a route behind login — used for /admin and /profile. Applies the same way in mock mode
// (stub identities) and real-backend mode (real JWT); AuthService.token() is the single source of
// truth for "is someone logged in" either way. Redirects to /login with a returnUrl so the user
// lands back where they started once they sign in.
//
// SSR note: the session lives in localStorage, which doesn't exist on the server — this app's dev
// server renders every hard navigation through the SSR entry, so a naive check would see "no
// token" server-side even for a logged-in user and wrongly redirect (a real bug hit while testing
// this). Server-side, allow the navigation through and let the client re-run this same guard on
// hydration, which reads the real localStorage and enforces it correctly.
export const requireLoginGuard: CanActivateFn = (_route, state) => {
  if (typeof window === 'undefined') return true;

  const auth = inject(AuthService);
  if (auth.token()) return true;

  const router = inject(Router);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

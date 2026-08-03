import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Gates a route behind admin access — applied to /admin/users specifically (a more sensitive
// surface than the rest of /admin, which today relies solely on backend enforcement). Defense in
// depth only: the real gate is still each backend's own AdminGuard, this just avoids rendering the
// page at all for a non-admin. Same SSR note as requireLoginGuard — no localStorage server-side, so
// let the navigation through and let the client re-run this on hydration.
export const requireAdminGuard: CanActivateFn = (_route, state) => {
  if (typeof window === 'undefined') return true;

  const auth = inject(AuthService);
  if (auth.token() && auth.isAdmin()) return true;

  const router = inject(Router);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

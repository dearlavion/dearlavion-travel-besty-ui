import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '../common/toast/toast.service';
import { environment } from '../../environments/environment';

// Catches 401s from the real backends (store-engine / payment-service reject with
// `{ statusCode: 401 }` once a JWT expires or fails verification) and turns them into a visible
// toast + redirect to /login. Without this, a stale token just makes admin/profile pages look
// empty or broken — each component's own local error state (e.g. AdminOrdersComponent's inline
// "Could not load orders") never explains *why*. Login/register calls (authUrl) are excluded — a
// 401 there means "wrong password", which LoginComponent already reports itself.
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  const backends = [environment.apiUrl, environment.paymentUrl, environment.notificationUrl].filter(Boolean);
  const isBackendRequest = backends.some((base) => req.url.startsWith(base));

  return next(req).pipe(
    catchError((err: unknown) => {
      // Compare only the path — router.url after a redirect is `/login?returnUrl=...`, and a naive
      // `!== '/login'` check would still pass, letting a second stray 401 (a sibling request that
      // was in flight when the first one redirected) nest another returnUrl inside itself.
      const currentPath = router.url.split('?')[0];
      if (isBackendRequest && err instanceof HttpErrorResponse && err.status === 401 && currentPath !== '/login') {
        authService.logout();
        toast.error('Your session has expired. Please log in again.');
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    }),
  );
};

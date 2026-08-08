import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// Attaches the Bearer token to requests that go to the real backends (store-engine `apiUrl`, the
// payment-service `paymentUrl`, auth-service-v2's own `authUrl` for the admin/users endpoints,
// dearlavion-notification-service's `notificationUrl` for "Email my kit", and
// dearlavion-spring-master-data-service's `masterDataUrl` for the admin Master Data page) — only
// meaningful in real-backend mode; useMockData:true never issues these requests in the first
// place. `authUrl` is safe to include here even though login/register also target it: those fire
// before a token exists, so the `token &&` check below already skips attaching one.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const backends = [
    environment.apiUrl,
    environment.paymentUrl,
    environment.authUrl,
    environment.notificationUrl,
    environment.masterDataUrl,
  ].filter(Boolean);
  if (token && backends.some((base) => req.url.startsWith(base))) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

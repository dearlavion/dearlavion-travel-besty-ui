import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// Attaches the stub-issued Bearer token to every request that goes to the real backend
// (environment.apiUrl) — only meaningful in real-backend mode; useMockData:true never issues
// these requests in the first place.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token && environment.apiUrl && req.url.startsWith(environment.apiUrl)) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

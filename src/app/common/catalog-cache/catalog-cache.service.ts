import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CatalogCacheStatus {
  /** When the in-memory snapshot was last built. */
  builtAt: string;
  products: number;
  items: number;
  /** false when the backend runs in pass-through mode — nothing is held, so nothing goes stale. */
  cached: boolean;
  /** Spring cron expression, or '' for no scheduled refresh. */
  refreshCron: string;
}

/**
 * The product cache the store engine serves surveys from. Surfacing `builtAt` matters as much as the
 * reset button does: a cache whose staleness is invisible is the failure mode that costs hours.
 */
@Injectable({ providedIn: 'root' })
export class CatalogCacheService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/catalog`;

  readonly status = signal<CatalogCacheStatus | null>(null);

  load(): Observable<CatalogCacheStatus> {
    return this.http.get<CatalogCacheStatus>(`${this.base}/status`).pipe(tap((s) => this.status.set(s)));
  }

  /** Rebuild now — for changes the app didn't make (a migration, an edit straight in Atlas). */
  refresh(): Observable<CatalogCacheStatus> {
    return this.http.post<CatalogCacheStatus>(`${this.base}/refresh`, {}).pipe(tap((s) => this.status.set(s)));
  }

  /** Blank clears the schedule. The backend rejects an invalid expression with a 400. */
  updateCron(refreshCron: string): Observable<CatalogCacheStatus> {
    return this.http
      .put<CatalogCacheStatus>(`${this.base}/settings`, { refreshCron })
      .pipe(tap((s) => this.status.set(s)));
  }
}

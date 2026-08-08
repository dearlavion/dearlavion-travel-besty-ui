import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MasterDataItem {
  id: string;
  value: string;
  order: number;
  emoji?: string | null;
  subtext?: string | null;
  code?: string | null;
}

export interface MasterDataCollection {
  key: string;
  label: string;
  /** REST path segment on dearlavion-spring-master-data-service, e.g. GET /destinations. */
  path: string;
}

// PUT /admin/{collectionPath}/{id} body shape — `code` is intentionally absent, it's never
// exposed via the API (see dearlavion-spring-master-data-service's Duration.java), only set by
// that service's seed data.
export interface UpdateMasterDataItemRequest {
  value: string;
  order: number;
  emoji?: string | null;
  subtext?: string | null;
}

// Mirrors the 8 reference-data types dearlavion-spring-master-data-service owns (see that repo's
// README) — each is its own Mongo collection/REST resource, not one generic axis-keyed list.
export const MASTER_DATA_COLLECTIONS: MasterDataCollection[] = [
  { key: 'destination', label: 'Destinations', path: 'destinations' },
  { key: 'season', label: 'Seasons', path: 'seasons' },
  { key: 'party', label: 'Parties', path: 'parties' },
  { key: 'transportation', label: 'Transportation', path: 'transportation-modes' },
  { key: 'activity', label: 'Activities', path: 'activities' },
  { key: 'kitCategory', label: 'Kit Categories', path: 'kit-categories' },
  { key: 'duration', label: 'Durations', path: 'durations' },
  { key: 'gender', label: 'Genders', path: 'genders' },
];

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly http = inject(HttpClient);

  getItems(collectionPath: string): Observable<MasterDataItem[]> {
    return this.http.get<MasterDataItem[]>(`${environment.masterDataUrl}/${collectionPath}`);
  }

  updateItem(collectionPath: string, id: string, body: UpdateMasterDataItemRequest): Observable<MasterDataItem> {
    return this.http.put<MasterDataItem>(`${environment.masterDataUrl}/admin/${collectionPath}/${id}`, body);
  }
}

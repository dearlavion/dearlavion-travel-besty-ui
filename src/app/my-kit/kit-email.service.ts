import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { KitExport } from './kit-export';

const EMAIL_KIT_URL = `${environment.notificationUrl}/notification/email/kit`;

interface KitEmailBody {
  kitTitle: string;
  summary: string;
  items: { label: string; productName?: string; price?: number }[];
}

function toBody(k: KitExport): KitEmailBody {
  return {
    kitTitle: k.title,
    summary: k.summary,
    items: k.items.map((it) => ({
      label: it.label,
      productName: it.product?.name,
      price: it.product?.price,
    })),
  };
}

/**
 * Real backend send for My Kit's "Email my kit" action — POSTs to dearlavion-notification-service
 * (see that repo's KitEmailController). Authenticated only: the recipient is always the caller's
 * own account email (resolved server-side from the bearer token, never sent from here) — logged-
 * out visitors use kit-export.ts's mailto: fallback instead, never this service.
 */
@Injectable({ providedIn: 'root' })
export class KitEmailService {
  private readonly http = inject(HttpClient);

  send(kit: KitExport): Observable<{ sent: boolean }> {
    return this.http.post<{ sent: boolean }>(EMAIL_KIT_URL, toBody(kit));
  }
}

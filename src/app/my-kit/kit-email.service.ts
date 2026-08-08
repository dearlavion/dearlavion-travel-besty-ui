import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { KitExport } from './kit-export';

const EMAIL_KIT_URL = `${environment.notificationUrl}/notification/email/kit`;

interface KitEmailSuggestion {
  productId: string;
  itemId: string;
  name: string;
}

interface KitEmailBody {
  kitTitle: string;
  summary: string;
  items: {
    label: string;
    kitCategory?: string;
    productName?: string;
    price?: number;
    suggestions: KitEmailSuggestion[];
  }[];
  destination?: string;
}

function toBody(k: KitExport): KitEmailBody {
  return {
    kitTitle: k.title,
    summary: k.summary,
    items: k.items.map((it) => ({
      label: it.label,
      kitCategory: it.kitCategory ?? undefined,
      productName: it.product?.name,
      price: it.product?.price,
      // Up to 3 clickable product suggestions per item (see KitEmailController's grouped-by-
      // category kit card) — id/productId, not the resolved item itself, since the backend only
      // needs enough to build a /product/:id/items/:itemId link.
      suggestions: (it.suggestions ?? []).map((s) => ({ productId: s.productId, itemId: s.id, name: s.name })),
    })),
    destination: k.destination,
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

import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

// Manages a single <script type="application/ld+json"> tag in <head> — Angular has no built-in
// for structured data, unlike Meta/Title. One tag is reused/replaced per navigation rather than
// appending a new one each time, so stale schema from a previous page never lingers.
@Injectable({ providedIn: 'root' })
export class JsonLdService {
  private readonly document = inject(DOCUMENT);
  private scriptEl: HTMLScriptElement | null = null;

  set(data: Record<string, unknown>): void {
    if (!this.scriptEl) {
      // SSR/prerendering runs this service on the server too, emitting a tag into the HTML the
      // browser receives. Hydration then boots a fresh client-side instance of this root singleton
      // whose own `scriptEl` starts null — without this lookup it wouldn't know about that
      // server-rendered tag and would append a second one, leaving the first (now-stale) tag as
      // the one `document.querySelector` finds on subsequent reads.
      this.scriptEl = this.document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    }
    if (!this.scriptEl) {
      this.scriptEl = this.document.createElement('script');
      this.scriptEl.type = 'application/ld+json';
      this.document.head.appendChild(this.scriptEl);
    }
    this.scriptEl.text = JSON.stringify(data);
  }

  clear(): void {
    this.scriptEl?.remove();
    this.scriptEl = null;
  }
}

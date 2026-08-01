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

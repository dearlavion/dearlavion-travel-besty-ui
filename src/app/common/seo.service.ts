import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description: string;
  ogImage?: string;
}

// Thin wrapper around Angular's Meta/Title services (SSR/prerender-safe out of the box) plus a
// hand-managed canonical <link>, since Angular has no built-in for that. Call setSeo() from every
// indexable route's component so each page ships a unique <title>/description instead of the one
// static <title> in index.html that every route previously shared.
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setSeo(data: SeoData): void {
    this.titleService.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: data.description });

    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: data.description });

    if (data.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: data.ogImage });
      this.meta.updateTag({ name: 'twitter:image', content: data.ogImage });
    }

    this.setCanonical();
  }

  // Path-only, deliberately not absolute: Angular's prerenderer renders each route against an
  // ephemeral internal server, so `location.origin` at build time is always some localhost:PORT,
  // never the real deployed host — baking that in would ship a wrong canonical from every
  // prerendered page. A relative canonical is valid per spec (resolved against the page's own
  // URL) and sidesteps needing to hardcode a domain this repo has no record of anywhere.
  private setCanonical(): void {
    const path = this.document.location?.pathname;
    if (!path) return;

    let link = this.document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', path);
  }
}

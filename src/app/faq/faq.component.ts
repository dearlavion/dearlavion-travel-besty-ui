import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FooterComponent } from '../common/footer/footer.component';
import { SeoService } from '../common/seo.service';
import { JsonLdService } from '../common/json-ld.service';
import { FAQ_ITEMS } from './faq.data';

// Dedicated FAQ page — the answer-engine-optimization counterpart to the SEO work elsewhere in
// this app. Renders FAQ_ITEMS twice from the one shared array: once as the visible accordion
// below, once as FAQPage JSON-LD (constructor) — never two independently-maintained copies of the
// same answers, since mismatched schema vs. visible text is exactly what gets FAQ rich results
// suppressed.
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [FooterComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css',
})
export class FaqComponent implements OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);

  protected readonly items = FAQ_ITEMS;
  protected readonly openIndex = signal<number | null>(0);

  constructor() {
    this.seo.setSeo({
      title: 'Frequently Asked Questions | Travel Besty',
      description:
        'Answers to common questions about how Travel Besty builds your kit, payment methods, order tracking, cancellations, saved kits, and shipping.',
    });

    this.jsonLd.set({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  ngOnDestroy(): void {
    this.jsonLd.clear();
  }

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }
}

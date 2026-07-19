import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TravelKitService } from '../travel/travel-kit.service';
import { Product, getProductTint } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { CartService } from '../cart/cart.service';
import { SavedKitsService } from './saved-kits.service';
import { buildKitMailto, downloadKitPdf, KitExport } from './kit-export';

interface DisplayItem {
  label: string;
  productId: string;
  product: Product | undefined;
  tint: string;
}

// Cycled per item so the kit list reads as pastel/varied, distinct from the mini product
// card's own tint (which follows the same destination/season/popular logic as Shop).
const PASTEL_TINTS = [
  'var(--tint-pink)',
  'var(--tint-green)',
  'var(--tint-lavender)',
  'var(--tint-marigold)',
  'var(--tint-yellow)',
  'var(--tint-blue)',
  'var(--tint-violet)',
];

@Component({
  selector: 'app-my-kit',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './my-kit.component.html',
  styleUrl: './my-kit.component.css',
})
export class MyKitComponent {
  private readonly travelKitService = inject(TravelKitService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly cart = inject(CartService);
  private readonly savedKitsService = inject(SavedKitsService);

  protected readonly getProductTint = getProductTint;
  protected readonly kit = this.travelKitService.currentKit;
  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly addedIds = signal<ReadonlySet<string>>(new Set());

  // Save / export UI state
  protected readonly showSaveInput = signal(false);
  protected readonly saveName = signal('');
  protected readonly savedMessage = signal('');
  protected readonly exporting = signal(false);

  protected readonly displayItems = computed<DisplayItem[]>(() => {
    const kit = this.kit();
    if (!kit) return [];
    return kit.items.map((item, index) => ({
      label: item.label,
      productId: item.productId,
      product: this.catalog.getById(item.productId),
      tint: PASTEL_TINTS[index % PASTEL_TINTS.length],
    }));
  });

  protected isExpanded(productId: string): boolean {
    return this.expandedIds().has(productId);
  }

  protected isAdded(productId: string): boolean {
    return this.addedIds().has(productId);
  }

  protected toggleExpanded(productId: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    this.expandedIds.set(next);
  }

  protected addToCart(productId: string): void {
    this.cart.addItem(productId);

    const next = new Set(this.addedIds());
    next.add(productId);
    this.addedIds.set(next);

    setTimeout(() => {
      const reverted = new Set(this.addedIds());
      reverted.delete(productId);
      this.addedIds.set(reverted);
    }, 2000);
  }

  // ── Export / save actions ──────────────────────────────────────────────

  /** Flatten the current kit for email/PDF export. */
  private exportPayload(): KitExport | null {
    const k = this.kit();
    if (!k) return null;
    return {
      title: k.title ?? 'Your Travel Kit',
      summary: k.summary,
      items: this.displayItems().map((d) => ({ label: d.label, product: d.product })),
    };
  }

  /** Download the kit as a PDF (jsPDF loaded lazily, browser-only). */
  protected async downloadPdf(): Promise<void> {
    const payload = this.exportPayload();
    if (!payload) return;
    this.exporting.set(true);
    try {
      await downloadKitPdf(payload);
    } finally {
      this.exporting.set(false);
    }
  }

  /** Open the user's email client with the kit list pre-filled. */
  protected emailKit(): void {
    const payload = this.exportPayload();
    if (!payload || typeof window === 'undefined') return;
    window.location.href = buildKitMailto(payload);
  }

  protected startSave(): void {
    this.saveName.set(this.kit()?.title ?? '');
    this.showSaveInput.set(true);
  }

  protected cancelSave(): void {
    this.showSaveInput.set(false);
  }

  protected confirmSave(): void {
    const k = this.kit();
    if (!k) return;
    const saved = this.savedKitsService.save(this.saveName(), k);
    this.showSaveInput.set(false);
    this.savedMessage.set(`Saved as "${saved.name}"`);
    setTimeout(() => this.savedMessage.set(''), 2500);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TravelKitService, BuiltKit } from '../travel/travel-kit.service';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { buildKitFromPopularKit } from '../travel/popular-kit-view';
import { getProductTint } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { CartService } from '../cart/cart.service';
import { SavedKitsService } from './saved-kits.service';
import { buildKitMailto, downloadKitPdf, KitExport } from './kit-export';

interface DisplayItem {
  label: string;
  productId: string;
  // Each generic Product suggestion resolved down to its own purchasable default item — primary
  // match first (if it resolves), then related — capped at MAX_SUGGESTIONS.
  suggestions: ProductItemView[];
  hasMoreSuggestions: boolean;
  moreSuggestionsCategory: string | null;
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

const MAX_SUGGESTIONS = 3;
// Generous enough to cover this catalog's largest single category, so "hasMoreSuggestions" is
// based on the true related-product count rather than an artificially truncated lookup.
const RELATED_LOOKUP_LIMIT = 20;

@Component({
  selector: 'app-my-kit',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './my-kit.component.html',
  styleUrl: './my-kit.component.css',
})
export class MyKitComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly travelKitService = inject(TravelKitService);
  private readonly popularKitsService = inject(PopularKitsService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);
  private readonly savedKitsService = inject(SavedKitsService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly getProductTint = getProductTint;

  // At /popular/:id, resolve straight from PopularKitsService (stable, refresh-safe, shareable —
  // no reliance on prior in-memory state). At /my-kit (no :id param), fall back to whatever the
  // quiz's reveal step last stashed in TravelKitService — that flow has no stable identity to put
  // in a URL, so it stays session-only.
  protected readonly kit = computed<BuiltKit | null>(() => {
    const id = this.paramMap()?.get('id');
    if (id) {
      const popularKit = this.popularKitsService.getById(id);
      return popularKit ? buildKitFromPopularKit(popularKit, this.catalog) : null;
    }
    return this.travelKitService.currentKit();
  });

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
    return kit.items.map((item, index) => {
      const primary = this.catalog.getById(item.productId);
      const related = primary ? this.catalog.getRelated(primary, RELATED_LOOKUP_LIMIT) : [];
      // Resolve each generic Product suggestion down to its purchasable default item — full
      // unification guarantees every product has one, but a suggestion is dropped if its item
      // somehow can't resolve rather than rendering a broken card.
      const candidates = primary ? [primary, ...related] : [];
      const resolved = candidates
        .map((p) => this.productItems.getDefault(p.id))
        .filter((v): v is ProductItemView => !!v);
      const suggestions = resolved.slice(0, MAX_SUGGESTIONS);
      return {
        label: item.label,
        productId: item.productId,
        suggestions,
        hasMoreSuggestions: resolved.length > MAX_SUGGESTIONS,
        moreSuggestionsCategory: primary?.category ?? null,
        tint: PASTEL_TINTS[index % PASTEL_TINTS.length],
      };
    });
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
      items: this.displayItems().map((d) => ({ label: d.label, product: d.suggestions[0] })),
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

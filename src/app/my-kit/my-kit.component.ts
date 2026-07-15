import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TravelKitService } from '../travel/travel-kit.service';
import { Product, getProductById, getProductTint } from '../shop/product-catalog';

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
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './my-kit.component.html',
  styleUrl: './my-kit.component.css',
})
export class MyKitComponent {
  private readonly travelKitService = inject(TravelKitService);

  protected readonly getProductTint = getProductTint;
  protected readonly kit = this.travelKitService.currentKit;
  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly addedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly displayItems = computed<DisplayItem[]>(() => {
    const kit = this.kit();
    if (!kit) return [];
    return kit.items.map((item, index) => ({
      label: item.label,
      productId: item.productId,
      product: getProductById(item.productId),
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

  protected addToKit(productId: string): void {
    const next = new Set(this.addedIds());
    next.add(productId);
    this.addedIds.set(next);

    setTimeout(() => {
      const reverted = new Set(this.addedIds());
      reverted.delete(productId);
      this.addedIds.set(reverted);
    }, 2000);
  }
}

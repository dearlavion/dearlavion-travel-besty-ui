import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { PricePipe } from '../common/price.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TravelKitService, BuiltKit } from '../travel/travel-kit.service';
import { KitItem } from '../travel/kit-recommendation';
import { PopularKitsService } from '../admin/popular-kits/popular-kits.service';
import { buildKitFromPopularKit } from '../travel/popular-kit-view';
import { getProductTint, Product } from '../shop/product-catalog';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { CartService } from '../cart/cart.service';
import { AuthService } from '../auth/auth.service';
import { SavedKitsService } from './saved-kits.service';
import { buildKitMailto, downloadKitPdf, KitExport } from './kit-export';
import { NewsletterService } from './newsletter.service';
import { NewsletterPopupComponent } from './newsletter-popup/newsletter-popup.component';
import { FooterComponent } from '../common/footer/footer.component';
import { ToastService } from '../common/toast/toast.service';
import { TaxonomyService } from '../common/taxonomy.service';
import { KitEmailService } from './kit-email.service';
import { environment } from '../../environments/environment';

interface DisplayItem {
  label: string;
  productId: string;
  // The item's packing-list bucket, straight off its catalog product — null when the product
  // can't be resolved (e.g. a manually-added or since-removed product), grouped under "Other".
  kitCategory: string | null;
  // Each generic Product suggestion resolved down to its own purchasable default item — primary
  // match first (if it resolves), then related — capped at MAX_SUGGESTIONS.
  suggestions: ProductItemView[];
  hasMoreSuggestions: boolean;
  moreSuggestionsCategory: string | null;
  tint: string;
}

interface DisplayGroup {
  category: string;
  items: DisplayItem[];
}

const OTHER_GROUP = 'Other' as const;

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
  imports: [RouterLink, PricePipe, FormsModule, NewsletterPopupComponent, FooterComponent],
  templateUrl: './my-kit.component.html',
  styleUrl: './my-kit.component.css',
})
export class MyKitComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly travelKitService = inject(TravelKitService);
  private readonly popularKitsService = inject(PopularKitsService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly savedKitsService = inject(SavedKitsService);
  private readonly newsletter = inject(NewsletterService);
  private readonly kitEmail = inject(KitEmailService);
  private readonly toast = inject(ToastService);
  private readonly taxonomy = inject(TaxonomyService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly getProductTint = getProductTint;

  constructor() {
    // Discard any pending add/remove edits when navigating to a different kit — a stale draft
    // from the previous kit must never bleed into the next one.
    effect(() => {
      this.paramMap()?.get('savedId');
      this.draftItems.set(null);
    });
  }

  // Saving a kit persists to the auth-scoped /kits collection (real mode) or is only ever visible
  // at /profile/collection (guarded by requireLoginGuard) either way — so a guest who "saved" one
  // would have no way to ever see it again. Gate the action itself instead of letting them hit a
  // silent 403 (real mode) or a kit that's saved but functionally unreachable (mock mode).
  protected readonly isLoggedIn = computed(() => !!this.auth.token());

  // At /popular/:id or /my-kit/:savedId, resolve straight from PopularKitsService/SavedKitsService
  // (stable, refresh-safe, shareable — no reliance on prior in-memory state). At bare /my-kit (no
  // id param), fall back to whatever the quiz's reveal step last stashed in TravelKitService —
  // that flow has no stable identity to put in a URL, so it stays session-only.
  protected readonly kit = computed<BuiltKit | null>(() => {
    const savedId = this.paramMap()?.get('savedId');
    if (savedId) {
      const saved = this.savedKitsService.kits().find((k) => k.id === savedId);
      // The name the user actually saved it under always wins as the displayed title — the inner
      // BuiltKit.title is only ever set for kits sourced from a PopularKit (task 33), so without
      // this override a custom-named quiz-built kit would fall back to the generic "Your Travel
      // Kit" instead of showing what the user called it.
      return saved ? { ...saved.kit, title: saved.name } : null;
    }
    const id = this.paramMap()?.get('id');
    if (id) {
      const popularKit = this.popularKitsService.getById(id);
      return popularKit ? buildKitFromPopularKit(popularKit, this.catalog) : null;
    }
    return this.travelKitService.currentKit();
  });

  private readonly savedId = computed(() => this.paramMap()?.get('savedId') ?? null);

  // Manual add/remove only makes sense for a user's own saved kit — not the ephemeral in-memory
  // quiz result (bare /my-kit, nothing to persist to) and not /popular/:id (admin-curated shared
  // content, not personal).
  protected readonly isSavedKit = computed(() => this.savedId() !== null);

  // True only for the bare /my-kit quiz-result case (see the `kit` computed above) — the one
  // path where a refresh silently loses the built kit, since TravelKitService holds it in
  // memory only. /my-kit/:savedId and /popular/:id both resolve from persisted data and survive
  // a refresh fine, so they don't need this warning.
  protected readonly isEphemeralKit = computed(
    () => this.kit() !== null && this.savedId() === null && !this.paramMap()?.get('id'),
  );

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.isEphemeralKit()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly addedIds = signal<ReadonlySet<string>>(new Set());

  // Save / export UI state
  protected readonly showSaveInput = signal(false);
  protected readonly saveName = signal('');
  protected readonly exporting = signal(false);
  protected readonly sendingEmail = signal(false);
  protected readonly showNewsletterPopup = signal(false);

  // Add-item picker state (only rendered when isSavedKit())
  protected readonly showAddItem = signal(false);
  protected readonly addItemSearch = signal('');

  // Pending add/remove edits for a saved kit — null means "no pending edits, just show the saved
  // kit's own items"; non-null is a local draft the user is still building, only persisted once
  // they click "Update kit" (commitItemChanges()). Nothing here writes through to
  // SavedKitsService until that explicit confirm, unlike the old behavior where every click saved
  // immediately.
  private readonly draftItems = signal<KitItem[] | null>(null);
  protected readonly hasPendingChanges = computed(() => this.draftItems() !== null);
  protected readonly effectiveItems = computed<KitItem[]>(() => this.draftItems() ?? this.kit()?.items ?? []);

  // Catalog products not already in this kit, matching the search term — same filter idiom
  // AdminProductFormComponent.searchResults uses for its "link a product" picker.
  protected readonly addItemResults = computed<Product[]>(() => {
    // Guaranteed loaded already whenever displayItems() has run (getRelated() triggers it
    // internally) — called again here too so an emptied-out kit (nothing for displayItems() to
    // iterate) still gets the catalog fetched for this picker.
    this.catalog.ensureAllLoaded();
    const term = this.addItemSearch().trim().toLowerCase();
    const inKit = new Set(this.effectiveItems().map((i) => i.productId));
    const list = this.catalog.products().filter((p) => p.active && !inKit.has(p.id));
    if (!term) return list.slice(0, 20);
    return list
      .filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
      .slice(0, 20);
  });

  protected readonly displayItems = computed<DisplayItem[]>(() => {
    return this.effectiveItems().map((item, index) => {
      const primary = this.catalog.getById(item.productId);
      const related = primary ? this.catalog.getRelated(primary, RELATED_LOOKUP_LIMIT) : [];
      // The recommendation engine already picked the trip-appropriate SKU (size/variant) for the
      // primary suggestion — use it when it resolves, so "Add to Cart" adds that exact size; fall
      // back to the product's default item otherwise. Related products resolve to their defaults.
      const primaryItem =
        (item.productItemId ? this.productItems.getById(item.productItemId) : undefined) ??
        (primary ? this.productItems.getDefault(primary.id) : undefined);
      const relatedItems = related.map((p) => this.productItems.getDefault(p.id));
      const seen = new Set<string>();
      const resolved = [primaryItem, ...relatedItems].filter(
        (v): v is ProductItemView => !!v && !seen.has(v.id) && !!seen.add(v.id),
      );
      const suggestions = resolved.slice(0, MAX_SUGGESTIONS);
      return {
        label: item.label,
        productId: item.productId,
        kitCategory: primary?.kitCategory ?? null,
        suggestions,
        hasMoreSuggestions: resolved.length > MAX_SUGGESTIONS,
        moreSuggestionsCategory: primary?.category ?? null,
        tint: PASTEL_TINTS[index % PASTEL_TINTS.length],
      };
    });
  });

  // Groups displayItems() by kit category, in the same canonical order as the survey/admin
  // dropdown (the admin-editable kitCategory taxonomy, see TaxonomyService/Kit Settings), with
  // unresolved items bucketed under "Other" last. Only categories that actually have items are
  // included, so the page never shows empty sections.
  protected readonly groupedDisplayItems = computed<DisplayGroup[]>(() => {
    const byCategory = new Map<string, DisplayItem[]>();
    for (const item of this.displayItems()) {
      const key = item.kitCategory ?? OTHER_GROUP;
      const list = byCategory.get(key);
      if (list) {
        list.push(item);
      } else {
        byCategory.set(key, [item]);
      }
    }
    return [...this.taxonomy.forAxis('kitCategory').map((v) => v.value), OTHER_GROUP]
      .filter((category) => byCategory.has(category))
      .map((category) => ({ category, items: byCategory.get(category)! }));
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

  // ── Manual add/remove (saved kits only, see isSavedKit()) ───────────────
  // Edits only touch the local draft — nothing is persisted until commitItemChanges() ("Update
  // kit") is clicked, so the user can add/remove several items before deciding to save.

  protected removeItem(productId: string): void {
    if (!this.isSavedKit()) return;
    this.draftItems.set(this.effectiveItems().filter((i) => i.productId !== productId));
  }

  protected toggleAddItem(): void {
    this.showAddItem.update((v) => !v);
    this.addItemSearch.set('');
  }

  protected addItem(product: Product): void {
    if (!this.isSavedKit()) return;
    this.draftItems.set([...this.effectiveItems(), { label: product.name, productId: product.id }]);
    this.addItemSearch.set('');
  }

  protected commitItemChanges(): void {
    const id = this.savedId();
    const items = this.draftItems();
    if (!id || items === null) return;
    this.savedKitsService.updateItems(id, items);
    this.draftItems.set(null);
    this.toast.showAndReload('Kit updated');
  }

  protected discardItemChanges(): void {
    this.draftItems.set(null);
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

  /** Download the kit as a PDF — first offers the optional newsletter opt-in (unless this
   * browser already subscribed), since that's the one moment a visitor has shown real intent to
   * keep something from the site. Declining or dismissing the popup still downloads the PDF; the
   * subscribe prompt never blocks it. */
  protected downloadPdf(): void {
    if (!this.newsletter.subscribed()) {
      this.showNewsletterPopup.set(true);
      return;
    }
    void this.performDownload();
  }

  protected onNewsletterSubscribe(email: string): void {
    this.newsletter.subscribe(email).subscribe();
    this.showNewsletterPopup.set(false);
    void this.performDownload();
  }

  protected onNewsletterDismiss(): void {
    this.showNewsletterPopup.set(false);
    void this.performDownload();
  }

  private async performDownload(): Promise<void> {
    const payload = this.exportPayload();
    if (!payload) return;
    this.exporting.set(true);
    try {
      await downloadKitPdf(payload);
    } finally {
      this.exporting.set(false);
    }
  }

  /** Logged in (and the notification backend is actually deployed): asks the backend to send the
   * kit to the caller's own account email. Logged out, or notificationUrl isn't configured for
   * this environment yet (see environment.prod.ts) — falls back to the original mailto: link, so
   * anonymous visitors and not-yet-deployed environments see no regression. */
  protected emailKit(): void {
    const payload = this.exportPayload();
    if (!payload || typeof window === 'undefined') return;

    if (!this.isLoggedIn() || !environment.notificationUrl) {
      window.location.href = buildKitMailto(payload);
      return;
    }

    this.sendingEmail.set(true);
    this.kitEmail.send(payload).subscribe({
      next: () => {
        this.sendingEmail.set(false);
        this.toast.success('Kit emailed — check your inbox!');
      },
      error: () => {
        this.sendingEmail.set(false);
        this.toast.error('Could not email your kit. Please try again.');
      },
    });
  }

  protected startSave(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.saveName.set(this.kit()?.title ?? '');
    this.showSaveInput.set(true);
  }

  protected cancelSave(): void {
    this.showSaveInput.set(false);
  }

  protected confirmSave(): void {
    const k = this.kit();
    if (!k) return;

    const savedId = this.savedId();
    if (savedId) {
      // Already a saved kit — rename it in place instead of creating a duplicate via save().
      const newName = this.saveName().trim() || 'My kit';
      this.savedKitsService.rename(savedId, newName);
      this.showSaveInput.set(false);
      this.toast.showAndReload(`Updated "${newName}"`);
      return;
    }

    const saved = this.savedKitsService.save(this.saveName(), k);
    this.showSaveInput.set(false);
    // Stays right here rather than redirecting to /my-kit/:id — same reason the admin item/product
    // forms' create flow doesn't jump straight to the new resource's own page: save()'s returned
    // id is a placeholder in real-backend mode (server-assigned id isn't known until the POST
    // resolves), so it's not safe to build a URL from it yet.
    this.toast.showAndReload(`Saved as "${saved.name}"`);
  }
}

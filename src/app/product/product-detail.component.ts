import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PricePipe } from '../common/price.pipe';
import { getProductTint } from '../shop/product-catalog';
import { ProductItemService, ProductItemView } from '../shop/product-item.service';
import { CartService } from '../cart/cart.service';
import { parseYouTubeId } from './youtube-embed';
import { SeoService } from '../common/seo.service';
import { JsonLdService } from '../common/json-ld.service';
import { ORGANIZATION_ID, organizationNode, websiteNode, breadcrumbNode } from '../common/site-entities';

interface VideoCard {
  title: string;
  url: string;
  author?: string;
  embedUrl: SafeResourceUrl | null;
}

// The reusable template for any single product item — one route (`/product/:id/items/:itemId`,
// or bare `/product/:id` for the cheapest/default item), the id(s) decide what renders.
// Everything the page shows (name/category/description/tags AND price/stock/brand) comes from
// ProductItemView — the public aggregate already joins in the parent Product's display fields and
// already excludes items whose parent product is inactive, so this component never needs a
// separate ProductCatalogService fetch. No in-page variant switcher — a sibling brand/variant is a
// full navigation via "You might also like" instead.
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, PricePipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly productItems = inject(ProductItemService);
  private readonly cart = inject(CartService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly paramMap = toSignal(this.route.paramMap);

  protected readonly getProductTint = getProductTint;
  protected readonly added = signal(false);
  protected readonly quantity = signal(1);
  protected readonly selectedImageIndex = signal(0);

  // Shop/My Kit link straight to a specific item (`/product/:id/items/:itemId`) so this page
  // shows that exact variant, not just the product's cheapest/default one.
  private readonly routeItemId = computed(() => this.paramMap()?.get('itemId') ?? null);

  // Set only when this tab was opened via the admin form's "Preview" button — see
  // ProductItemService.consumePreviewDraft(). Overlaid onto whatever the normal fetch loads, so
  // unedited fields (category, tags, popular, etc., which the item form doesn't even expose)
  // still come from the real data.
  protected readonly previewDraft = signal<Partial<ProductItemView> | null>(null);

  constructor() {
    // Targeted fetches (GET /product-items?productId=:id and ?id=:itemId), never the full
    // catalog — this page only ever needs one product's items, so it shouldn't pull all 500 just
    // to render one. Both fire in parallel; neither depends on the other resolving first.
    effect(() => {
      const id = this.paramMap()?.get('id');
      if (id) this.productItems.loadForProduct(id);
    });
    effect(() => {
      const itemId = this.routeItemId();
      if (itemId) this.productItems.loadItem(itemId);
    });
    effect(() => {
      const itemId = this.routeItemId();
      if (itemId) this.previewDraft.set(this.productItems.consumePreviewDraft(itemId));
    });

    // A new item (variant switch, or navigating to a sibling via "You might also like") should
    // always start back on its own cover photo, not whatever index was scrolled to previously.
    effect(() => {
      this.selectedItem()?.id;
      this.selectedImageIndex.set(0);
    });

    // Reactive, not one-shot — the item loads async, so this fires once on the initial resolve and
    // again on every variant switch (title/description/JSON-LD must always match what's on screen).
    effect(() => {
      const item = this.selectedItem();
      if (!item) return;

      this.seo.setSeo({
        title: `${item.name}${item.brand ? ' by ' + item.brand : ''} | Travel Besty`,
        description: item.description || `Shop ${item.name} — field-tested travel gear from Travel Besty.`,
        ogImage: item.image,
      });

      const productNode = {
        '@type': 'Product',
        name: item.name,
        description: item.description || undefined,
        image: item.images.length > 0 ? item.images : item.image ? [item.image] : undefined,
        sku: item.id,
        // The manufacturer/brand of the item (e.g. "Samsonite") — distinct from who sells it.
        brand: item.brand ? { '@type': 'Brand', name: item.brand } : undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: item.currency,
          price: item.price,
          availability:
            item.soldOut || item.stock <= 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          // Links this Offer to the shared Organization node — Travel Besty is the seller,
          // regardless of which manufacturer brand the item itself is.
          seller: { '@id': ORGANIZATION_ID },
        },
      };

      this.jsonLd.set({
        '@context': 'https://schema.org',
        '@graph': [
          organizationNode(),
          websiteNode(),
          breadcrumbNode([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
            { name: item.name, url: `/product/${item.productId}/items/${item.id}` },
          ]),
          productNode,
        ],
      });
    });
  }

  ngOnDestroy(): void {
    // Otherwise navigating away leaves this product's schema attached to whatever page comes next.
    this.jsonLd.clear();
  }

  // Every item under this product — used only to resolve a bare-route fallback and to build "You
  // might also like" below; there's no in-page picker anymore, so this never drives the page's
  // own displayed item once a specific one is named in the URL.
  protected readonly items = computed<ProductItemView[]>(() => this.productItems.currentProductItems());

  // The directly-fetched single item a Shop/My-Kit link named, else whichever the sibling list
  // resolves that id to (covers the moment before the direct fetch resolves), else the cheapest
  // (default) one for a bare /product/:id visit.
  protected readonly selectedItem = computed<ProductItemView | undefined>(() => {
    const routeChoice = this.routeItemId();
    let base: ProductItemView | undefined;
    if (routeChoice) {
      const direct = this.productItems.currentItem();
      if (direct?.id === routeChoice) base = direct;
      else base = this.items().find((i) => i.id === routeChoice);
    }
    base ??= this.items()[0];
    const draft = this.previewDraft();
    return base && draft ? { ...base, ...draft } : base;
  });

  // Sibling items under the same parent product (other brands/variants), excluding whichever one
  // is currently shown — e.g. viewing "Samsonite Passport Wallet" suggests the wallet's other
  // brand options, not unrelated products from the wider catalog.
  protected readonly relatedProducts = computed<ProductItemView[]>(() => {
    const current = this.selectedItem();
    return this.items().filter((i) => i.id !== current?.id);
  });

  // Destination/season/party tags, minus the "applies to everything" placeholder value — showing
  // "All" three times over doesn't tell a shopper anything.
  protected readonly tags = computed<string[]>(() => {
    const item = this.selectedItem();
    if (!item) return [];
    const all: string[] = [...item.destinations, ...item.seasons, ...item.parties];
    return all.filter((tag) => tag !== 'All');
  });

  // Up to 5 clickable gallery photos. Falls back to the single legacy `image` field for items an
  // admin hasn't added a gallery to yet, so nothing regresses for existing catalog data.
  protected readonly galleryImages = computed<string[]>(() => {
    const item = this.selectedItem();
    if (!item) return [];
    if (item.images.length > 0) return item.images;
    return item.image ? [item.image] : [];
  });

  protected readonly activeImage = computed<string | undefined>(() => {
    const images = this.galleryImages();
    return images[this.selectedImageIndex()] ?? images[0];
  });

  protected selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  // Influencer/testimonial videos, each resolved to a trusted embed URL when the link is
  // recognizably YouTube — built only from the parsed 11-char video id against a fixed template,
  // never from the raw admin-entered string, before it ever reaches bypassSecurityTrustResourceUrl.
  // Anything else (TikTok, Instagram, a malformed link) gets `embedUrl: null` and the template
  // renders a "watch elsewhere" card instead of an iframe.
  protected readonly videoCards = computed<VideoCard[]>(() => {
    const item = this.selectedItem();
    if (!item) return [];
    return item.videos.map((video) => {
      const youtubeId = parseYouTubeId(video.url);
      const embedUrl = youtubeId
        ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${youtubeId}`)
        : null;
      return { title: video.title, url: video.url, author: video.author, embedUrl };
    });
  });

  protected incrementQuantity(): void {
    const max = this.selectedItem()?.stock ?? 1;
    this.quantity.update((q) => Math.min(q + 1, Math.max(max, 1)));
  }

  protected decrementQuantity(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  protected addToCart(): void {
    const item = this.selectedItem();
    if (!item || item.soldOut) return;

    this.cart.addItem(item.id, this.quantity());
    this.added.set(true);
    this.quantity.set(1);
    setTimeout(() => this.added.set(false), 2000);
  }
}

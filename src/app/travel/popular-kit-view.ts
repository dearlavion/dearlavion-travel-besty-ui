import { PopularKit } from '../admin/popular-kits/popular-kits.service';
import { ProductCatalogService } from '../shop/product-catalog.service';
import { KitItem } from './kit-recommendation';
import { BuiltKit } from './travel-kit.service';

export interface PopularKitCard {
  id: string;
  image: string;
  name: string;
  tag: string;
  meta: string;
}

// Shapes a raw admin-curated PopularKit (from /admin/popular-kits) into the display-ready card
// both HomeComponent's marquee and TravelComponent's gallery render. `meta`'s item count is
// derived from the live catalog so it can never drift out of sync with what /popular/:id
// actually builds.
export function toPopularKitCard(kit: PopularKit, catalog: ProductCatalogService): PopularKitCard {
  const linkedCount = kit.productIds.filter((id) => catalog.getById(id)).length;
  return {
    id: kit.id,
    image: kit.image,
    name: kit.name,
    tag: kit.tag,
    meta: `${linkedCount} items · ${kit.tag}`,
  };
}

// Builds the BuiltKit MyKitComponent renders at /popular/:id, straight from a PopularKit's
// linked products — no navigation/state-setting here, this is a pure resolve step so the route
// itself (not a prior click) is the single source of truth, making /popular/:id shareable and
// refresh-safe.
export function buildKitFromPopularKit(kit: PopularKit, catalog: ProductCatalogService): BuiltKit {
  const { destination, season, party, duration } = kit;
  const partyPart = party === 'Group' ? ' with the group' : '';
  // Duration labels ("A proper break") read as standalone answer choices, not clause fragments —
  // drop a leading "a " so it doesn't collide with the "your" already in front.
  const durationPhrase = duration.toLowerCase().replace(/^a /, '');
  // Skip any productId whose product has since been deleted from the catalog rather than showing
  // a broken entry with no name/price/image.
  const items: KitItem[] = kit.productIds
    .map((id) => catalog.getById(id))
    .filter((product) => !!product)
    .map((product) => ({ label: product.name, productId: product.id }));
  return {
    items,
    summary: `Built for your ${durationPhrase} ${season.toLowerCase()} trip to the ${destination.toLowerCase()}${partyPart} — here's everything you'll need.`,
    title: kit.name,
  };
}

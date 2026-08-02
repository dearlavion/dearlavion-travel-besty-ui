// Shared JSON-LD building blocks (schema.org) — every page composes these into its own `@graph`
// via JsonLdService, so Organization/WebSite facts are defined once instead of drifting across
// five separate copies, and page-specific nodes (Product, FAQPage) can reference them by `@id` to
// form an actual linked graph rather than disconnected per-page blocks.
//
// `@id`s are local fragments (`#organization`, `#website`), not domain-qualified — this repo has
// no record of its own real production hostname anywhere (same gap already flagged for
// robots.txt/sitemap and worked around for canonical <link> tags), and Angular's prerenderer
// renders each route against an ephemeral localhost:PORT server, so anything sourced from
// `document.location` here would bake a wrong domain into the static HTML. Once the real domain
// is known, prefix these ids/urls with it — everything else here already sourced from real,
// non-fabricated site content (see the GEO plan for what was deliberately left out and why:
// no AggregateRating, no Person/founder, no opening hours/areas served — none of that data
// exists anywhere in this app).

export const ORGANIZATION_ID = '#organization';
export const WEBSITE_ID = '#website';

export function organizationNode(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Travel Besty',
    description: 'Personalized, field-tested travel packing kits and gear, built from a few quick questions about your trip.',
    email: 'hello@travelbesty.com',
    // Already live, publicly-displayed handles (about.component.html's "Get in touch" section) —
    // re-expressed as structured data, not new claims.
    sameAs: ['https://instagram.com/travelbesty', 'https://tiktok.com/@travelbesty'],
  };
}

export function websiteNode(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'Travel Besty',
    publisher: { '@id': ORGANIZATION_ID },
    // /shop?search={term} is a real, functioning search URL (ShopComponent reads/writes the
    // `search` query param) — not a fabricated capability.
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: '/shop?search={search_term}',
      },
      'query-input': 'required name=search_term',
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbNode(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

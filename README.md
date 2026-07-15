# dearlavion-travel-besty-ui

"Travel Besty" 🌷 — a travel-essentials shop with a quiz-style "build your kit" onboarding flow.
Angular 20, standalone components, zoneless change detection — mirrors this workspace's
`dearlavion-web-ui` / `dearlavion-salon-ui` conventions.

Ported from the static mockups in `../travel-kit/` (`travel-kit-homepage.html`, `travel-page.html`,
`travel-shop-page.html`). No real backend yet — product/recommendation data lives in plain TS
constants (`shop/product-catalog.ts`, `travel/kit-recommendation.ts`).

## Development server

```bash
yarn start
```

Open `http://localhost:4200/`.

## Building

```bash
yarn build
```

## Running unit tests

```bash
yarn test
```

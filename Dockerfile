# =========================
# Stage 1: Build Angular App
# =========================
FROM node:20-alpine AS build

WORKDIR /app

# Install deps
COPY package.json yarn.lock ./

# Update baseline-browser-mapping
RUN yarn add baseline-browser-mapping@latest -D

RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build Angular app (production) — prerenders the static/catalog-listing routes marked in
# app.routes.server.ts (Home/Travel/Shop/About) so crawlers get real HTML + the per-route
# title/meta tags baked in, instead of the empty <app-root> shell every route used to ship.
# Product Detail stays CSR-only (RenderMode.Server, the ** fallback) — full SSR for a dynamic,
# backend-driven catalog is a bigger deployment change, deliberately out of scope here.
RUN yarn build --configuration production

# =========================
# Stage 2: Runtime (Nginx)
# =========================
FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Remove default config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Angular browser build (SSR-compatible)
COPY --from=build /app/dist/dearlavion-travel-besty-ui/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

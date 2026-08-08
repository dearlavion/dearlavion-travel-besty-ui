// Production/dev-server build — used by `ng build --configuration production` (the Dockerfile).
// These backend URLs are baked in at BUILD time (the browser calls them directly), so they must be
// the public HTTPS hostnames the services are exposed at through nginx — not container names.
// Update these to match the actual DNS if the deploy hostnames change.
export const environment = {
  production: true,
  useMockData: false,
  apiUrl: 'https://api-store.dearlavion.site',
  paymentUrl: 'https://api-pay.dearlavion.site',
  authUrl: 'https://api-auth.dearlavion.site',
  // Not deployed yet — dearlavion-notification-service is local-only for now. "Email my kit"
  // silently falls back to mailto: in prod until this is set (see auth.interceptor.ts's
  // `.filter(Boolean)` on the backends list).
  notificationUrl: '',
  customer: 'travel-besty',
};

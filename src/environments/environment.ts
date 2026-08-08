// Default environment — used by plain `yarn start` / `ng serve` (no --configuration flag).
// Every service in this app has a localStorage-backed mock code path; useMockData:true keeps
// that path active so the app runs standalone with zero backend dependency.
export const environment = {
  production: false,
  useMockData: true,
  apiUrl: '',
  // Empty in mock mode — login uses the local stub identities (no real auth-service call).
  authUrl: '',
  // Empty in mock mode — payments are stored locally.
  paymentUrl: '',
  // Empty in mock mode — "Email my kit" falls back to the client-side mailto: link.
  notificationUrl: '',
  // Empty in mock mode — admin Master Data page has no mock fallback (real-backend-only feature).
  masterDataUrl: '',
  // Tenant id sent as X-Customer on real auth calls (unused in mock mode).
  customer: 'travel-besty',
};

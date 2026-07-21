// Default environment — used by plain `yarn start` / `ng serve` (no --configuration flag).
// Every service in this app has a localStorage-backed mock code path; useMockData:true keeps
// that path active so the app runs standalone with zero backend dependency.
export const environment = {
  production: false,
  useMockData: true,
  apiUrl: '',
  // Empty in mock mode — login uses the local stub identities (no real auth-service call).
  authUrl: '',
  // Tenant id sent as X-Customer on real auth calls (unused in mock mode).
  customer: 'travel-besty',
};

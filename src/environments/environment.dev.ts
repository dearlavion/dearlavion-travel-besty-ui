// Real-backend environment — used by `yarn start:dev` (ng serve --configuration=dev).
// Points at the locally-running dearlavion-store-engine (see that repo's README for setup).
// Auth is expected to come from the store-engine's bundled dev-auth-stub (POST /auth/verify on
// :8099) rather than a real auth-service — see AuthenticationService for the token format
// (`tok:<userId>:<username>`).
export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:4000',
  // Real auth-service-v2 (username/email + password login, issues the JWT store-engine verifies).
  authUrl: 'http://localhost:9081',
  // Which tenant this app is — sent as the X-Customer header on auth calls (one auth instance
  // serves many customers, each with its own authentication-<customer> DB).
  customer: 'travel-besty',
};

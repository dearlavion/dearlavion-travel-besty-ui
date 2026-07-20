// Real-backend environment — used by `yarn start:dev` (ng serve --configuration=dev).
// Points at the locally-running dearlavion-store-engine (see that repo's README for setup).
// Auth is expected to come from the store-engine's bundled dev-auth-stub (POST /auth/verify on
// :8099) rather than a real auth-service — see AuthenticationService for the token format
// (`tok:<userId>:<username>`).
export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:4000',
};

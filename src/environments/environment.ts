// Default environment — used by plain `yarn start` / `ng serve` (no --configuration flag).
// Every service in this app has a localStorage-backed mock code path; useMockData:true keeps
// that path active so the app runs standalone with zero backend dependency.
export const environment = {
  production: false,
  useMockData: true,
  apiUrl: '',
};

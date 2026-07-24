// Currencies a user can pick as their preferred display currency. Mirrors the store-engine's
// SUPPORTED_CURRENCIES (src/common/currency.ts) — keep the two lists in sync.
export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'PHP', label: 'PHP — Philippine Peso' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
];

/** Catalog prices are stored in this base currency; rates are "units per 1 USD". */
export const BASE_CURRENCY = 'USD';

/** Seed/fallback rates (units per 1 USD) — mirrors the store-engine's DEFAULT_RATES. Used until the
 * real rates load, and for mock mode. Admins set the live values from the dashboard. */
export const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  PHP: 58,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  SGD: 1.35,
  CAD: 1.36,
  JPY: 157,
};

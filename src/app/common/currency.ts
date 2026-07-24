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

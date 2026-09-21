export interface AvailableCurrency {
  id?: string;
  code: string; // e.g. "BDT", "USD", "EUR"
  symbol: string; // e.g. "৳", "$", "€"
  name: string; // e.g. "Bangladeshi Taka", "US Dollar"
  isDefault?: boolean;
}

export interface CurrencyPricing {
  currency: string; // e.g. "BDT", "USD"
  symbol: string; // e.g. "৳", "$"
  regularPrice: string; // e.g. "50,000", "100tk"
  discountPrice?: string; // e.g. "30,000", "80tk"
}

export const DEFAULT_CURRENCIES: AvailableCurrency[] = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", isDefault: true },
  { code: "USD", symbol: "$", name: "US Dollar" },
];

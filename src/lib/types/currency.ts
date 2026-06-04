export type PortalCurrencyOption = {
  code: string;
  country: string;
  flag: string;
  label: string;
};

export const portalCurrencyOptions: PortalCurrencyOption[] = [
  { code: "USD", country: "United States", flag: "🇺🇸", label: "US Dollar" },
  { code: "GBP", country: "United Kingdom", flag: "🇬🇧", label: "British Pound" },
  { code: "EUR", country: "Eurozone", flag: "🇪🇺", label: "Euro" },
  { code: "INR", country: "India", flag: "🇮🇳", label: "Indian Rupee" },
  { code: "CAD", country: "Canada", flag: "🇨🇦", label: "Canadian Dollar" },
  { code: "AUD", country: "Australia", flag: "🇦🇺", label: "Australian Dollar" },
];

export function getPortalCurrencyOption(code: string | null | undefined) {
  const normalizedCode = (code ?? "USD").trim().toUpperCase();

  return (
    portalCurrencyOptions.find((option) => option.code === normalizedCode) ??
    portalCurrencyOptions[0]
  );
}

export function isSupportedPortalCurrency(code: string) {
  return portalCurrencyOptions.some((option) => option.code === code.trim().toUpperCase());
}

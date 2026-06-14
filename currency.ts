/**
 * Country (ISO-3166-1 alpha-2) → default fiat currency (ISO-4217) mapping.
 *
 * Used when a user's account is created — the main, trading and social
 * wallets are denominated in the local currency of the country supplied
 * at signup (or, when the registration country is missing/unknown, of
 * the country recorded on the approved KYC record). Anything not in the
 * map falls back to USD so that the platform always has a sensible
 * default and never persists an empty currency string.
 */

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // North America
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  // Europe (Eurozone)
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR",
  FI: "EUR", FR: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR",
  LU: "EUR", LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR",
  SK: "EUR",
  // Europe (non-Eurozone)
  GB: "GBP",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "EUR",
  IS: "ISK",
  TR: "TRY",
  RU: "RUB",
  UA: "UAH",
  // Asia-Pacific
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  HK: "HKD",
  TW: "TWD",
  KR: "KRW",
  SG: "SGD",
  MY: "MYR",
  TH: "THB",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  // Middle East
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  IL: "ILS",
  // Africa
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  GH: "GHS",
  EG: "EGP",
  MA: "MAD",
  // South & Central America
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
};

export const DEFAULT_FALLBACK_CURRENCY = "USD";

/**
 * Resolve the default fiat currency for a country code. Accepts ISO-3166-1
 * alpha-2 codes (case-insensitive) as well as a few common full-name
 * variants used in the signup form. Returns USD when the input is empty,
 * unknown, or not a recognised country.
 */
export function currencyForCountry(country?: string | null): string {
  if (!country) return DEFAULT_FALLBACK_CURRENCY;
  const trimmed = country.trim();
  if (!trimmed) return DEFAULT_FALLBACK_CURRENCY;

  const upper = trimmed.toUpperCase();
  if (COUNTRY_TO_CURRENCY[upper]) return COUNTRY_TO_CURRENCY[upper]!;

  // A small number of full country names that appear in older data /
  // form submissions get normalised to an ISO code before lookup.
  const NAME_TO_ISO: Record<string, string> = {
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    USA: "US",
    CANADA: "CA",
    "UNITED KINGDOM": "GB",
    UK: "GB",
    "GREAT BRITAIN": "GB",
    GERMANY: "DE",
    FRANCE: "FR",
    SPAIN: "ES",
    ITALY: "IT",
    NETHERLANDS: "NL",
    AUSTRALIA: "AU",
    JAPAN: "JP",
    CHINA: "CN",
    INDIA: "IN",
    BRAZIL: "BR",
    MEXICO: "MX",
    NIGERIA: "NG",
    "SOUTH AFRICA": "ZA",
  };
  const iso = NAME_TO_ISO[upper];
  if (iso && COUNTRY_TO_CURRENCY[iso]) return COUNTRY_TO_CURRENCY[iso]!;

  return DEFAULT_FALLBACK_CURRENCY;
}

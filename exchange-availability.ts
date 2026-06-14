/**
 * Region availability for exchange wallet providers (MoonPay / Coinbase).
 *
 * MoonPay's "buy crypto" service is unavailable in sanctioned and certain
 * regulatory-restricted jurisdictions. The default unsupported list below
 * is a conservative baseline; deployers can override it via the
 * MOONPAY_UNSUPPORTED_COUNTRIES env var (a JSON array of ISO-3166-1
 * alpha-2 codes, e.g. `["CU","IR","KP","SY"]`).
 *
 * Coinbase On-ramp / Commerce is treated as globally available for now,
 * but the API surface keeps the same shape so a future restriction list
 * can be added without churning callers.
 */
import { logger } from "./logger";
import { env } from "./env";

const DEFAULT_MOONPAY_UNSUPPORTED: readonly string[] = [
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "RU", // Russia
  "BY", // Belarus
  "VE", // Venezuela
  "AF", // Afghanistan
];

function parseList(raw: string | undefined): readonly string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((c) => typeof c === "string")
    ) {
      return (parsed as string[]).map((c) => c.trim().toUpperCase()).filter(Boolean);
    }
    logger.warn(
      { raw },
      "MOONPAY_UNSUPPORTED_COUNTRIES did not parse as JSON string array — falling back to defaults.",
    );
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "MOONPAY_UNSUPPORTED_COUNTRIES is not valid JSON — falling back to defaults.",
    );
  }
  return null;
}

export function moonpayUnsupportedCountries(): readonly string[] {
  return parseList(env.MOONPAY_UNSUPPORTED_COUNTRIES) ?? DEFAULT_MOONPAY_UNSUPPORTED;
}

export function isCountryMoonpayBlocked(country: string | null | undefined): boolean {
  if (!country) return false;
  const code = country.trim().toUpperCase();
  return moonpayUnsupportedCountries().includes(code);
}

export function moonpayUnsupportedReason(
  country: string | null | undefined,
): string | null {
  if (!isCountryMoonpayBlocked(country)) return null;
  return `MoonPay is not available in ${country?.toUpperCase()} due to local regulatory restrictions.`;
}

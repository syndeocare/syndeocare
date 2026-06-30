import { SITE_CONFIG } from "@/config/constants";

type SupportedLanguage = "ar" | "en" | string;

export function normalizeLocalCurrency(currency?: string | null) {
  return !currency || currency === "USD" ? SITE_CONFIG.currency : currency;
}

export function formatMoney(
  amount: number | null | undefined,
  language: SupportedLanguage,
  currency?: string | null,
) {
  const locale = language === "ar" ? "ar-YE" : "en";
  const value = Number.isFinite(amount) ? Number(amount) : 0;
  const formattedAmount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
  const normalizedCurrency = normalizeLocalCurrency(currency);
  const labels: Record<string, { ar: string; en: string }> = {
    YER: { ar: SITE_CONFIG.currencySymbol, en: SITE_CONFIG.currency },
  };
  const label =
    labels[normalizedCurrency]?.[language === "ar" ? "ar" : "en"] ??
    normalizedCurrency;

  return language === "ar"
    ? `${formattedAmount} ${label}`
    : `${formattedAmount} ${label}`;
}

export function formatHourlyRate(
  amount: number | null | undefined,
  language: SupportedLanguage,
  currency?: string | null,
) {
  return `${formatMoney(amount, language, currency)}${language === "ar" ? " / ساعة" : "/hour"}`;
}

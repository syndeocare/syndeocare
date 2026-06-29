import { displayLabel } from "../lib/format";
import type { AppLanguage } from "../lib/preferences";

const fallbackMessages: Record<AppLanguage, string> = {
  ar: "حدث خطأ غير متوقع. حاول مرة أخرى.",
  en: "Something went wrong. Please try again.",
};

export function toUserMessage(
  error?: Error | null | string,
  language: AppLanguage = "en",
) {
  const raw = typeof error === "string" ? error : error?.message;
  const localized = displayLabel(raw, language);
  if (!localized) return fallbackMessages[language];

  const looksTechnical =
    /uncaught|promise|stack|trace|syntaxerror|typeerror|referenceerror/i.test(
      localized,
    );

  return looksTechnical ? fallbackMessages[language] : localized;
}

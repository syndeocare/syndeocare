const YEMEN_MOBILE_PREFIXES = ["71", "73", "77", "78"];

export function normalizeYemeniPhoneInput(value: string) {
  return value.replace(/\D/g, "").replace(/^967/, "").slice(0, 9);
}

export function isValidYemeniMobile(value: string) {
  const normalized = normalizeYemeniPhoneInput(value);

  return (
    normalized.length === 9 &&
    YEMEN_MOBILE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

export function formatYemeniPhone(value: string) {
  return `+967${normalizeYemeniPhoneInput(value)}`;
}

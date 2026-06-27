export const API_GATEWAY_BASE_URL =
  process.env.EXPO_PUBLIC_API_GATEWAY_BASE_URL?.replace(/\/$/, "") ??
  "https://api.syndeocare.ai/v1";

export const YEMEN_PHONE_REGEX = /^(71|73|77|78)\d{7}$/;

export const validateYemenPhone = (value: string) =>
  YEMEN_PHONE_REGEX.test(value.replace(/\D/g, ""));

export const formatYemenPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("967") ? `+${digits}` : `+967${digits}`;
};

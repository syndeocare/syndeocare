import type { AppLanguage } from "./preferences";
import type { Job, Money, VerificationStatus } from "../types";

const arabicLabelMap = new Map<string, string>([
  ["open", "مفتوحة"],
  ["filled", "مكتملة"],
  ["closed", "مغلقة"],
  ["requested", "قيد الانتظار"],
  ["accepted", "مقبول"],
  ["confirmed", "مؤكد"],
  ["completed", "مكتمل"],
  ["cancelled", "ملغى"],
  ["not_started", "لم يبدأ"],
  ["pending_review", "قيد المراجعة"],
  ["approved", "موثق"],
  ["rejected", "مرفوض"],
  ["healthcare facility", "منشأة صحية"],
  ["healthcare_facility", "منشأة صحية"],
  ["pending onboarding", "البيانات غير مكتملة"],
  ["licensed practical nurse (lpn)", "ممرض عملي مرخص"],
  ["registered nurse (rn)", "ممرض مسجل"],
  ["radiologic technologist", "فني أشعة"],
  ["nurse", "ممرض"],
  ["doctor", "طبيب"],
  ["pharmacist", "صيدلي"],
  ["laboratory technician", "فني مختبر"],
]);

const englishLabelMap = new Map<string, string>([
  ["not_started", "Not started"],
  ["pending_review", "Pending review"],
  ["healthcare_facility", "Healthcare facility"],
]);

export function displayLabel(
  value?: null | string,
  language: AppLanguage = "en",
) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase().replaceAll("_", " ");
  const exact = trimmed.toLowerCase();
  const map = language === "ar" ? arabicLabelMap : englishLabelMap;
  return map.get(exact) ?? map.get(normalized) ?? trimmed.replaceAll("_", " ");
}

export function verificationStatusLabel(
  status?: VerificationStatus,
  language: AppLanguage = "en",
) {
  return displayLabel(status, language);
}

export function formatDateTime(value: string, language: AppLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-YE" : "en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function formatTime(value: string, language: AppLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-YE" : "en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMoney(value: Money, language: AppLanguage) {
  const locale = language === "ar" ? "ar-YE" : "en";
  const amount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value.amount);
  const currency =
    language === "ar"
      ? value.currency === "USD"
        ? "دولار"
        : value.currency
      : value.currency;
  const unit =
    language === "ar"
      ? {
          contract: "عقد",
          day: "يوم",
          hour: "ساعة",
          shift: "مناوبة",
        }[value.unit]
      : value.unit;
  return language === "ar"
    ? `${amount} ${currency} / ${unit}`
    : `${amount} ${currency}/${unit}`;
}

export function formatShiftWindow(job: Job, language: AppLanguage) {
  const starts = new Date(job.startsAt);
  const ends = job.endsAt ? new Date(job.endsAt) : null;
  if (Number.isNaN(starts.getTime())) return "";
  const locale = language === "ar" ? "ar-YE" : "en";
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(starts);
  const startTime = formatTime(job.startsAt, language);
  const endTime =
    ends && !Number.isNaN(ends.getTime())
      ? formatTime(job.endsAt as string, language)
      : "";
  return endTime
    ? `${date} · ${startTime} - ${endTime}`
    : `${date} · ${startTime}`;
}

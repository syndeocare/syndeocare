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
  ["licensed practical nurse", "ممرض عملي مرخص"],
  ["registered nurse (rn)", "ممرض مسجل"],
  ["registered nurse", "ممرض مسجل"],
  ["certified nursing assistant (cna)", "مساعد تمريض معتمد"],
  ["certified nursing assistant", "مساعد تمريض معتمد"],
  ["phlebotomist", "فني سحب دم"],
  ["medical assistant", "مساعد طبي"],
  ["radiologic technologist", "فني أشعة"],
  ["radiology technician", "فني أشعة"],
  ["physical therapist", "أخصائي علاج طبيعي"],
  ["occupational therapist", "أخصائي علاج وظيفي"],
  ["icu/critical care", "العناية المركزة"],
  ["emergency medicine", "طب الطوارئ"],
  ["professional license", "رخصة مزاولة المهنة"],
  ["government id", "الهوية الحكومية"],
  ["government_id", "الهوية الحكومية"],
  ["certification", "الشهادات"],
  ["certifications", "الشهادات"],
  ["license", "رخصة مزاولة المهنة"],
  ["business license", "ترخيص المنشأة"],
  ["business_license", "ترخيص المنشأة"],
  ["trade license", "السجل التجاري"],
  ["trade_license", "السجل التجاري"],
  ["commercial registration", "السجل التجاري"],
  ["facility accreditation", "اعتماد المنشأة"],
  ["facility_accreditation", "اعتماد المنشأة"],
  ["insurance", "التأمين"],
  ["sana'a", "صنعاء"],
  ["sanaa", "صنعاء"],
  ["sana'a, yemen", "صنعاء، اليمن"],
  ["sanaa, yemen", "صنعاء، اليمن"],
  ["aden", "عدن"],
  ["aden, yemen", "عدن، اليمن"],
  ["taiz", "تعز"],
  ["taiz, yemen", "تعز، اليمن"],
  ["ta'izz", "تعز"],
  ["ta'izz, yemen", "تعز، اليمن"],
  ["al hudaydah", "الحديدة"],
  ["al hudaydah, yemen", "الحديدة، اليمن"],
  ["ibb", "إب"],
  ["ibb, yemen", "إب، اليمن"],
  ["mukalla", "المكلا"],
  ["mukalla, yemen", "المكلا، اليمن"],
  ["dhamar", "ذمار"],
  ["dhamar, yemen", "ذمار، اليمن"],
  ["seiyun", "سيئون"],
  ["seiyun, yemen", "سيئون، اليمن"],
  ["sayun", "سيئون"],
  ["sayun, yemen", "سيئون، اليمن"],
  ["saada", "صعدة"],
  ["saada, yemen", "صعدة، اليمن"],
  ["marib", "مأرب"],
  ["marib, yemen", "مأرب، اليمن"],
  ["yemen", "اليمن"],
  ["ar", "العربية"],
  ["arabic", "العربية"],
  ["en", "الإنجليزية"],
  ["english", "الإنجليزية"],
  ["nurse", "ممرض"],
  ["doctor", "طبيب"],
  ["pharmacist", "صيدلي"],
  ["laboratory technician", "فني مختبر"],
  ["google sign-in was cancelled.", "تم إلغاء تسجيل الدخول باستخدام Google."],
  ["google sign-in was cancelled", "تم إلغاء تسجيل الدخول باستخدام Google"],
  ["invalid email or password", "البريد الإلكتروني أو كلمة المرور غير صحيحة"],
  [
    "invalid username or password",
    "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  ],
  ["invalid parameter: redirect_uri", "تعذر فتح تسجيل الدخول باستخدام Google."],
  [
    "professional must be verification approved before requesting this booking",
    "يجب اعتماد ملف المختص قبل التقديم على هذه المناوبة",
  ],
]);

const englishLabelMap = new Map<string, string>([
  ["not_started", "Not started"],
  ["pending_review", "Pending review"],
  ["healthcare_facility", "Healthcare facility"],
  ["invalid parameter: redirect_uri", "Could not open Google sign-in."],
  [
    "professional must be verification approved before requesting this booking",
    "Your profile must be approved before you can apply for this shift.",
  ],
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

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
  ["tbd", "لم يتم تحديده بعد"],
  ["platform admin", "إدارة المنصة"],
  ["new message", "رسالة جديدة"],
  ["complete your professional onboarding profile", "أكمل ملفك المهني"],
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
  ["general dentist", "طبيب أسنان عام"],
  ["temporary dental assistant", "مساعد أسنان مؤقت"],
  ["professional license", "رخصة مزاولة المهنة"],
  ["government id", "الهوية الحكومية"],
  ["government_id", "الهوية الحكومية"],
  ["tax card", "البطاقة الضريبية"],
  ["tax_card", "البطاقة الضريبية"],
  ["authorized signatory id", "هوية المفوض بالتوقيع"],
  ["authorized_signatory_id", "هوية المفوض بالتوقيع"],
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
  ["amanat al asimah", "أمانة العاصمة"],
  ["sana'a, amanat al asimah", "صنعاء، أمانة العاصمة"],
  ["sana'a, amanat al asimah, yemen", "صنعاء، أمانة العاصمة، اليمن"],
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
  ["hadhramaut", "حضرموت"],
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
  ["zabid", "زبيد"],
  ["amran", "عمران"],
  ["al bayda", "البيضاء"],
  ["ataq", "عتق"],
  ["shabwah", "شبوة"],
  ["al ghaydah", "الغيضة"],
  ["al mahrah", "المهرة"],
  ["ibn", "إب"],
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
  [
    "google sign-in could not be verified. please try again.",
    "تعذر التحقق من تسجيل الدخول باستخدام Google. يرجى المحاولة مرة أخرى.",
  ],
  ["platform admin sent you a message.", "أرسلت إدارة المنصة رسالة إليك."],
]);

const englishLabelMap = new Map<string, string>([
  ["not_started", "Not started"],
  ["pending_review", "Pending review"],
  ["tbd", "Not set yet"],
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
  const mapped = map.get(exact) ?? map.get(normalized);
  if (mapped) return mapped;

  if (language === "ar") {
    let localized = trimmed.replaceAll("_", " ");
    const replacements = [
      ["Platform Admin", "إدارة المنصة"],
      ["New message", "رسالة جديدة"],
      ["sent you a message", "أرسل إليك رسالة"],
      ["Professional License", "رخصة مزاولة المهنة"],
      ["Government ID", "الهوية الحكومية"],
      ["Tax Card", "البطاقة الضريبية"],
      ["Authorized Signatory ID", "هوية المفوض بالتوقيع"],
      ["General Dentist", "طبيب أسنان عام"],
      ["Temporary Dental Assistant", "مساعد أسنان مؤقت"],
      ["Registered Nurse (RN)", "ممرض مسجل"],
      ["Amanat Al Asimah", "أمانة العاصمة"],
      ["Hadhramaut", "حضرموت"],
      ["Yemen", "اليمن"],
      ["Sana'a", "صنعاء"],
      ["Sanaa", "صنعاء"],
      ["Aden", "عدن"],
      ["Taiz", "تعز"],
      ["Ibb", "إب"],
    ] as const;

    for (const [from, to] of replacements) {
      localized = localized.replaceAll(from, to);
    }

    return localized.replaceAll(", ", "، ");
  }

  return trimmed.replaceAll("_", " ");
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

export function formatMessageTimestamp(value: string, language: AppLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const locale = language === "ar" ? "ar-YE" : "en";
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMessageDay = new Date(date);
  startOfMessageDay.setHours(0, 0, 0, 0);
  const dayDelta =
    (startOfToday.getTime() - startOfMessageDay.getTime()) /
    (24 * 60 * 60 * 1000);
  const time = formatTime(value, language);

  if (dayDelta === 0) return time;
  if (dayDelta === 1) {
    return language === "ar" ? `أمس ${time}` : `Yesterday ${time}`;
  }

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };

  return `${new Intl.DateTimeFormat(locale, options).format(date)} ${time}`;
}

export function formatMoney(value: Money, language: AppLanguage) {
  const locale = language === "ar" ? "ar-YE" : "en";
  const amount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value.amount);
  const currencyLabels: Record<string, { ar: string; en: string }> = {
    USD: { ar: "دولار", en: "USD" },
    YER: { ar: "ر.ي", en: "YER" },
  };
  const currency = currencyLabels[value.currency]?.[language] ?? value.currency;
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

import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nManager, Platform } from "react-native";

export type AppLanguage = "en" | "ar";
export type AppTheme = "light" | "dark";
export type AppDirection = "ltr" | "rtl";

const STORAGE_KEY = "syndeocare.mobile.preferences";

const en = {
  "app.tagline": "Healthcare staffing simplified",
  "auth.alreadyAccount": "Already have an account?",
  "auth.back": "Back",
  "auth.clinicDescription":
    "Post shifts, review applicants, and manage staffing coverage.",
  "auth.clinicSignup": "Clinic sign up",
  "auth.continueWithGoogle": "Continue with Google",
  "auth.createAccount": "Create account",
  "auth.createAccountToStart": "Create your account to start",
  "auth.email": "Email",
  "auth.emailFirstForReset": "Enter your email first, then request reset.",
  "auth.forgotPassword": "Forgot password?",
  "auth.fullName": "Full name",
  "auth.googleFirstHint":
    "Continue with Google for the fastest setup, or use email.",
  "auth.googleOpening": "Opening Google...",
  "auth.googleSecureHint":
    "A secure Google window will open, then return you to SyndeoCare.",
  "auth.join": "Join SyndeoCare",
  "auth.noAccount": "No account?",
  "auth.organizationName": "Organization name",
  "auth.password": "Password",
  "auth.passwordResetRequested": "Password reset email requested.",
  "auth.professionalDescription":
    "Find verified shifts, track applications, and message clinics.",
  "auth.professionalSignup": "Professional sign up",
  "auth.roleClinic": "I'm a clinic",
  "auth.roleProfessional": "I'm a professional",
  "auth.sendingReset": "Sending reset...",
  "auth.signIn": "Sign in",
  "auth.signInSubtitle": "Sign in to continue to your account",
  "auth.signInWithEmail": "Sign in with email",
  "auth.signUp": "Sign up",
  "auth.signUpWithEmail": "Sign up with email",
  "auth.startChoice": "Choose how you want to get started",
  "auth.terms":
    "By continuing, you agree to SyndeoCare terms and privacy policy.",
  "auth.welcomeBack": "Welcome back",
  "conversation.attachment": "Attachment:",
  "conversation.attachFile": "Attach file",
  "conversation.loading": "Loading conversation...",
  "conversation.message": "Message",
  "conversation.removeFile": "Remove",
  "conversation.send": "Send",
  "conversation.title": "Conversation",
  "common.loading": "Loading...",
  "controls.dark": "Dark",
  "controls.light": "Light",
  "dashboard.bookings": "Bookings",
  "dashboard.clinicBody":
    "Review applicants, publish shifts, and keep conversations moving.",
  "dashboard.clinicOperations": "Clinic operations",
  "dashboard.hi": "Hi {{name}}",
  "dashboard.latestConversation": "Latest conversation",
  "dashboard.loading": "Loading your workspace...",
  "dashboard.messages": "Messages",
  "dashboard.noConversationsBody":
    "When a clinic and professional are allowed to message, conversations appear here.",
  "dashboard.noConversationsTitle": "No conversations yet",
  "dashboard.noRecentMessage": "No recent message",
  "dashboard.openMessages": "Open messages",
  "dashboard.openShifts": "Open shifts",
  "dashboard.professionalBody":
    "Find shifts, track applications, and respond to clinics.",
  "dashboard.professionalWorkspace": "Professional workspace",
  "dashboard.there": "there",
  "dashboard.unreadAlerts": "Unread alerts",
  "messages.loading": "Loading messages...",
  "messages.noConversationsBody":
    "Messages become available when the backend permits contact between a clinic and professional.",
  "messages.noConversationsTitle": "No conversations",
  "messages.openConversation": "Open conversation",
  "messages.title": "Messages",
  "messages.unread": "{{count}} unread",
  "notifications.loading": "Loading alerts...",
  "notifications.delete": "Delete",
  "notifications.markAllRead": "Mark all as read",
  "notifications.markRead": "Mark read",
  "notifications.new": "new",
  "notifications.noNotificationsBody":
    "Booking, message, verification, and shift alerts will appear here.",
  "notifications.noNotificationsTitle": "No notifications",
  "notifications.read": "read",
  "notifications.title": "Notifications",
  "onboarding.complete": "{{count}}% complete",
  "onboarding.noRequiredDocumentsBody":
    "The backend currently has no missing documents for your account.",
  "onboarding.noRequiredDocumentsTitle": "No required documents",
  "onboarding.required": "required",
  "onboarding.requiredBeforeSubmit": "Required before submitting your account.",
  "onboarding.submitReview": "Submit for admin review",
  "onboarding.title": "Onboarding",
  "onboarding.uploadDocument": "Upload document",
  "onboarding.uploadFailed": "Upload failed. Please try again.",
  "onboarding.uploaded": "uploaded",
  "onboarding.uploadedReview": "Uploaded and ready for review.",
  "profile.bio": "Bio",
  "profile.accountSecurity": "Account security",
  "profile.changePassword": "Change password",
  "profile.currentPassword": "Current password",
  "profile.emailMissing": "Your account email is not available.",
  "profile.emailUnverified": "Your email is not verified yet.",
  "profile.emailVerified": "Your email is verified.",
  "profile.facilityDescription": "Facility description",
  "profile.imagePermission": "Allow photo access to upload your image.",
  "profile.loading": "Loading profile...",
  "profile.logout": "Log out",
  "profile.newPassword": "New password",
  "profile.passwordChanged": "Password updated.",
  "profile.passwordLength": "Use at least 8 characters for both passwords.",
  "profile.quickUpdate": "Quick profile update",
  "profile.save": "Save changes",
  "profile.resendVerification": "Resend verification email",
  "profile.title": "Profile",
  "profile.uploadLogo": "Upload logo",
  "profile.uploadPhoto": "Upload photo",
  "profile.verificationSent": "Verification email requested.",
  "profile.yemenFixed": "Yemen is fixed for launch: +967 only.",
  "profile.yemenPhone": "Yemeni phone number",
  "profile.yemenPhoneError":
    "Enter a valid Yemeni number starting with 71, 73, 77, or 78.",
  "shifts.alreadyApplied": "Already applied",
  "shifts.accept": "Accept",
  "shifts.amountInvalid": "Enter a valid hourly rate.",
  "shifts.applicationsBody":
    "Review shift requests and update applicants from here.",
  "shifts.applicationsTitle": "Applications",
  "shifts.applyProposal": "Apply with proposal",
  "shifts.applyTitle": "Apply for this shift",
  "shifts.applyBody":
    "Add a short proposal so the clinic understands your fit.",
  "shifts.cancel": "Cancel",
  "shifts.clinicNotReady": "Your clinic profile is not ready yet.",
  "shifts.createShift": "Create shift",
  "shifts.createShiftBody": "Publish a clear shift for verified professionals.",
  "shifts.decline": "Decline",
  "shifts.description": "Description",
  "shifts.detailsRequired":
    "Add summary, description, and at least one requirement.",
  "shifts.endsAt": "Ends at",
  "shifts.endsAtInvalid": "Enter a valid end date or leave it empty.",
  "shifts.hourlyRate": "Hourly rate",
  "shifts.inviteBody":
    "Verified professionals can be opened from the backend directory.",
  "shifts.inviteTitle": "Invite or message professionals",
  "shifts.loading": "Loading shifts...",
  "shifts.noApplicationsBody": "Applications for your shifts will appear here.",
  "shifts.noApplicationsTitle": "No applications yet",
  "shifts.noOpenBody":
    "Published shifts from approved clinics will appear here.",
  "shifts.noOpenTitle": "No open shifts",
  "shifts.publishShift": "Publish shift",
  "shifts.proposal": "Proposal",
  "shifts.proposalPlaceholder":
    "Share your availability, experience, or questions.",
  "shifts.requirements": "Requirements",
  "shifts.shiftTitle": "Shift title",
  "shifts.specialty": "Specialty",
  "shifts.startMessage": "Start message",
  "shifts.startsAt": "Starts at",
  "shifts.startsAtRequired": "Enter a valid start date.",
  "shifts.summary": "Summary",
  "shifts.submitApplication": "Submit application",
  "shifts.title": "Shifts",
  "shifts.titleRequired": "Enter a shift title.",
  "tabs.alerts": "Alerts",
  "tabs.home": "Home",
  "tabs.messages": "Messages",
  "tabs.profile": "Profile",
  "tabs.shifts": "Shifts",
  "validation.email": "Enter a valid email address.",
  "validation.name": "Enter at least two characters.",
  "validation.passwordLength": "Use at least 8 characters.",
  "validation.passwordNumber": "Add one number.",
  "validation.passwordUpper": "Add one uppercase letter.",
  "validation.ruleLength": "8+ characters",
  "validation.ruleNumber": "Number",
  "validation.ruleUpper": "Uppercase letter",
} as const;

type TranslationKey = keyof typeof en;

const ar: Record<TranslationKey, string> = {
  "app.tagline": "توظيف صحي مبسط",
  "auth.alreadyAccount": "لديك حساب بالفعل؟",
  "auth.back": "رجوع",
  "auth.clinicDescription":
    "انشر المناوبات، راجع المتقدمين، وأدر احتياجات التغطية.",
  "auth.clinicSignup": "التسجيل كمنشأة",
  "auth.continueWithGoogle": "المتابعة باستخدام Google",
  "auth.createAccount": "إنشاء الحساب",
  "auth.createAccountToStart": "أنشئ حسابك للبدء",
  "auth.email": "البريد الإلكتروني",
  "auth.emailFirstForReset":
    "أدخل بريدك الإلكتروني أولاً ثم اطلب إعادة التعيين.",
  "auth.forgotPassword": "نسيت كلمة المرور؟",
  "auth.fullName": "الاسم الكامل",
  "auth.googleFirstHint":
    "تابع باستخدام Google للإعداد الأسرع، أو استخدم البريد الإلكتروني.",
  "auth.googleOpening": "جاري فتح Google...",
  "auth.googleSecureHint":
    "ستفتح نافذة Google آمنة ثم تعود تلقائياً إلى SyndeoCare.",
  "auth.join": "انضم إلى SyndeoCare",
  "auth.noAccount": "ليس لديك حساب؟",
  "auth.organizationName": "اسم المنشأة",
  "auth.password": "كلمة المرور",
  "auth.passwordResetRequested": "تم طلب رسالة إعادة تعيين كلمة المرور.",
  "auth.professionalDescription":
    "اعثر على المناوبات الموثقة، تابع طلباتك، وتواصل مع المنشآت.",
  "auth.professionalSignup": "التسجيل كمختص صحي",
  "auth.roleClinic": "أنا منشأة صحية",
  "auth.roleProfessional": "أنا مختص صحي",
  "auth.sendingReset": "جاري إرسال الطلب...",
  "auth.signIn": "تسجيل الدخول",
  "auth.signInSubtitle": "سجل الدخول للمتابعة إلى حسابك",
  "auth.signInWithEmail": "تسجيل الدخول بالبريد الإلكتروني",
  "auth.signUp": "إنشاء حساب",
  "auth.signUpWithEmail": "إنشاء حساب بالبريد الإلكتروني",
  "auth.startChoice": "اختر طريقة البدء",
  "auth.terms": "بالمتابعة، فإنك توافق على شروط SyndeoCare وسياسة الخصوصية.",
  "auth.welcomeBack": "مرحباً بعودتك",
  "conversation.attachment": "مرفق:",
  "conversation.attachFile": "إرفاق ملف",
  "conversation.loading": "جاري تحميل المحادثة...",
  "conversation.message": "الرسالة",
  "conversation.removeFile": "إزالة",
  "conversation.send": "إرسال",
  "conversation.title": "المحادثة",
  "common.loading": "جاري التحميل...",
  "controls.dark": "داكن",
  "controls.light": "فاتح",
  "dashboard.bookings": "الحجوزات",
  "dashboard.clinicBody":
    "راجع المتقدمين، انشر المناوبات، وحافظ على سير المحادثات.",
  "dashboard.clinicOperations": "عمليات المنشأة",
  "dashboard.hi": "مرحباً {{name}}",
  "dashboard.latestConversation": "آخر محادثة",
  "dashboard.loading": "جاري تحميل مساحة العمل...",
  "dashboard.messages": "الرسائل",
  "dashboard.noConversationsBody":
    "عندما يسمح النظام بالتواصل بين منشأة ومختص، ستظهر المحادثات هنا.",
  "dashboard.noConversationsTitle": "لا توجد محادثات بعد",
  "dashboard.noRecentMessage": "لا توجد رسالة حديثة",
  "dashboard.openMessages": "فتح الرسائل",
  "dashboard.openShifts": "المناوبات المفتوحة",
  "dashboard.professionalBody":
    "اعثر على المناوبات، تابع طلباتك، ورد على المنشآت.",
  "dashboard.professionalWorkspace": "مساحة المختص",
  "dashboard.there": "بك",
  "dashboard.unreadAlerts": "تنبيهات غير مقروءة",
  "messages.loading": "جاري تحميل الرسائل...",
  "messages.noConversationsBody":
    "تظهر الرسائل عندما يسمح النظام بالتواصل بين المنشأة والمختص.",
  "messages.noConversationsTitle": "لا توجد محادثات",
  "messages.openConversation": "فتح المحادثة",
  "messages.title": "الرسائل",
  "messages.unread": "{{count}} غير مقروءة",
  "notifications.loading": "جاري تحميل التنبيهات...",
  "notifications.delete": "حذف",
  "notifications.markAllRead": "تحديد الكل كمقروء",
  "notifications.markRead": "تحديد كمقروء",
  "notifications.new": "جديد",
  "notifications.noNotificationsBody":
    "ستظهر هنا تنبيهات الحجوزات والرسائل والتحقق والمناوبات.",
  "notifications.noNotificationsTitle": "لا توجد تنبيهات",
  "notifications.read": "مقروء",
  "notifications.title": "التنبيهات",
  "onboarding.complete": "اكتمل {{count}}%",
  "onboarding.noRequiredDocumentsBody":
    "لا توجد حالياً مستندات ناقصة لحسابك في النظام.",
  "onboarding.noRequiredDocumentsTitle": "لا توجد مستندات مطلوبة",
  "onboarding.required": "مطلوب",
  "onboarding.requiredBeforeSubmit": "مطلوب قبل إرسال حسابك.",
  "onboarding.submitReview": "إرسال لمراجعة الإدارة",
  "onboarding.title": "إكمال البيانات",
  "onboarding.uploadDocument": "رفع المستند",
  "onboarding.uploadFailed": "فشل الرفع. يرجى المحاولة مرة أخرى.",
  "onboarding.uploaded": "تم الرفع",
  "onboarding.uploadedReview": "تم الرفع وجاهز للمراجعة.",
  "profile.bio": "نبذة",
  "profile.accountSecurity": "أمان الحساب",
  "profile.changePassword": "تغيير كلمة المرور",
  "profile.currentPassword": "كلمة المرور الحالية",
  "profile.emailMissing": "بريد حسابك غير متوفر.",
  "profile.emailUnverified": "بريدك الإلكتروني غير موثق بعد.",
  "profile.emailVerified": "بريدك الإلكتروني موثق.",
  "profile.facilityDescription": "وصف المنشأة",
  "profile.imagePermission": "اسمح بالوصول إلى الصور لرفع الصورة.",
  "profile.loading": "جاري تحميل الملف...",
  "profile.logout": "تسجيل الخروج",
  "profile.newPassword": "كلمة المرور الجديدة",
  "profile.passwordChanged": "تم تحديث كلمة المرور.",
  "profile.passwordLength": "استخدم 8 أحرف على الأقل لكلمتي المرور.",
  "profile.quickUpdate": "تحديث سريع للملف",
  "profile.save": "حفظ التغييرات",
  "profile.resendVerification": "إعادة إرسال رسالة التحقق",
  "profile.title": "الملف الشخصي",
  "profile.uploadLogo": "رفع الشعار",
  "profile.uploadPhoto": "رفع الصورة",
  "profile.verificationSent": "تم طلب رسالة التحقق.",
  "profile.yemenFixed": "اليمن ثابت للإطلاق: +967 فقط.",
  "profile.yemenPhone": "رقم الهاتف اليمني",
  "profile.yemenPhoneError":
    "أدخل رقماً يمنياً صحيحاً يبدأ بـ 71 أو 73 أو 77 أو 78.",
  "shifts.alreadyApplied": "تم التقديم مسبقاً",
  "shifts.accept": "قبول",
  "shifts.amountInvalid": "أدخل أجراً صحيحاً بالساعة.",
  "shifts.applicationsBody":
    "راجع طلبات المناوبات وحدّث حالة المتقدمين من هنا.",
  "shifts.applicationsTitle": "الطلبات",
  "shifts.applyProposal": "التقديم مع عرض",
  "shifts.applyTitle": "التقديم على هذه المناوبة",
  "shifts.applyBody": "أضف عرضاً مختصراً حتى تفهم المنشأة مدى ملاءمتك.",
  "shifts.cancel": "إلغاء",
  "shifts.clinicNotReady": "ملف المنشأة الخاص بك غير جاهز بعد.",
  "shifts.createShift": "إنشاء مناوبة",
  "shifts.createShiftBody": "انشر مناوبة واضحة للمختصين الموثقين.",
  "shifts.decline": "رفض",
  "shifts.description": "الوصف",
  "shifts.detailsRequired": "أضف ملخصاً ووصفاً ومتطلباً واحداً على الأقل.",
  "shifts.endsAt": "تنتهي في",
  "shifts.endsAtInvalid": "أدخل تاريخ انتهاء صحيحاً أو اتركه فارغاً.",
  "shifts.hourlyRate": "الأجر بالساعة",
  "shifts.inviteBody": "يمكن فتح ملفات المختصين الموثقين من دليل النظام.",
  "shifts.inviteTitle": "دعوة أو مراسلة المختصين",
  "shifts.loading": "جاري تحميل المناوبات...",
  "shifts.noApplicationsBody": "ستظهر هنا طلبات التقديم على مناوباتك.",
  "shifts.noApplicationsTitle": "لا توجد طلبات بعد",
  "shifts.noOpenBody": "ستظهر هنا المناوبات المنشورة من المنشآت المعتمدة.",
  "shifts.noOpenTitle": "لا توجد مناوبات مفتوحة",
  "shifts.publishShift": "نشر المناوبة",
  "shifts.proposal": "العرض",
  "shifts.proposalPlaceholder": "شارك تفرغك أو خبرتك أو أسئلتك.",
  "shifts.requirements": "المتطلبات",
  "shifts.shiftTitle": "عنوان المناوبة",
  "shifts.specialty": "التخصص",
  "shifts.startMessage": "بدء رسالة",
  "shifts.startsAt": "تبدأ في",
  "shifts.startsAtRequired": "أدخل تاريخ بداية صحيحاً.",
  "shifts.summary": "الملخص",
  "shifts.submitApplication": "إرسال الطلب",
  "shifts.title": "المناوبات",
  "shifts.titleRequired": "أدخل عنوان المناوبة.",
  "tabs.alerts": "التنبيهات",
  "tabs.home": "الرئيسية",
  "tabs.messages": "الرسائل",
  "tabs.profile": "الملف",
  "tabs.shifts": "المناوبات",
  "validation.email": "أدخل بريداً إلكترونياً صحيحاً.",
  "validation.name": "أدخل حرفين على الأقل.",
  "validation.passwordLength": "استخدم 8 أحرف على الأقل.",
  "validation.passwordNumber": "أضف رقماً واحداً.",
  "validation.passwordUpper": "أضف حرفاً كبيراً واحداً.",
  "validation.ruleLength": "8 أحرف أو أكثر",
  "validation.ruleNumber": "رقم",
  "validation.ruleUpper": "حرف كبير",
};

const dictionary: Record<AppLanguage, Record<TranslationKey, string>> = {
  ar,
  en,
};

type StoredPreferences = {
  language?: AppLanguage;
  theme?: AppTheme;
};

type PreferencesContextValue = {
  direction: AppDirection;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: AppTheme) => void;
  theme: AppTheme;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

async function loadPreferences(): Promise<StoredPreferences> {
  try {
    const value =
      Platform.OS === "web"
        ? window.localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return value ? (JSON.parse(value) as StoredPreferences) : {};
  } catch {
    return {};
  }
}

async function savePreferences(value: StoredPreferences) {
  const encoded = JSON.stringify(value);
  if (Platform.OS === "web") {
    window.localStorage.setItem(STORAGE_KEY, encoded);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, encoded);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [theme, setThemeState] = useState<AppTheme>("light");

  useEffect(() => {
    I18nManager.allowRTL(true);
    void loadPreferences().then((stored) => {
      if (stored.language === "ar" || stored.language === "en") {
        setLanguageState(stored.language);
      }
      if (stored.theme === "dark" || stored.theme === "light") {
        setThemeState(stored.theme);
      }
    });
  }, []);

  const persist = useCallback(
    (next: StoredPreferences) => {
      void savePreferences({
        language: next.language ?? language,
        theme: next.theme ?? theme,
      });
    },
    [language, theme],
  );

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      setLanguageState(nextLanguage);
      persist({ language: nextLanguage });
    },
    [persist],
  );

  const setTheme = useCallback(
    (nextTheme: AppTheme) => {
      setThemeState(nextTheme);
      persist({ theme: nextTheme });
    },
    [persist],
  );

  const value = useMemo<PreferencesContextValue>(() => {
    const direction: AppDirection = language === "ar" ? "rtl" : "ltr";
    return {
      direction,
      language,
      setLanguage,
      setTheme,
      theme,
      toggleLanguage: () => setLanguage(language === "ar" ? "en" : "ar"),
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      t: (key, fallback) => dictionary[language][key] ?? fallback ?? key,
    };
  }, [language, setLanguage, setTheme, theme]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}

export function useT() {
  return usePreferences().t;
}

export function interpolate(
  value: string,
  tokens: Record<string, string | number>,
) {
  return Object.entries(tokens).reduce(
    (result, [key, token]) => result.replaceAll(`{{${key}}}`, String(token)),
    value,
  );
}

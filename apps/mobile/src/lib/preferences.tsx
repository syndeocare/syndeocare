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
import {
  Appearance,
  I18nManager,
  Platform,
  useColorScheme,
} from "react-native";

export type AppLanguage = "en" | "ar";
export type AppLanguagePreference = "ar" | "device" | "en";
export type AppTheme = "light" | "dark";
export type AppThemePreference = "dark" | "light" | "system";
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
  "auth.googleCancelledNeutral":
    "Google sign-in was cancelled. You can continue when ready.",
  "auth.googleCompleting": "Completing Google sign-in...",
  "auth.googleCloseHint":
    "You can close this window if it does not close automatically.",
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
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.startChoice": "Choose how you want to get started",
  "auth.terms":
    "By continuing, you agree to SyndeoCare terms and privacy policy.",
  "auth.welcomeBack": "Welcome back",
  "conversation.attachment": "Attachment:",
  "conversation.attachFile": "Attach file",
  "conversation.composerTitle": "New message",
  "conversation.composerHint": "Messages and files are shared securely.",
  "conversation.emptyBody":
    "Send the first message when you are ready to continue the conversation.",
  "conversation.emptyTitle": "No messages yet",
  "conversation.loading": "Loading conversation...",
  "conversation.message": "Message",
  "conversation.messagePlaceholder": "Write a clear message...",
  "conversation.removeFile": "Remove",
  "conversation.send": "Send",
  "conversation.secureThread": "Secure conversation",
  "conversation.title": "Conversation",
  "conversation.you": "You",
  "common.cancel": "Cancel",
  "common.clear": "Clear",
  "common.loading": "Loading...",
  "common.optional": "optional",
  "controls.dark": "Dark",
  "controls.deviceLanguage": "Device",
  "controls.english": "English",
  "controls.language": "Language",
  "controls.light": "Light",
  "controls.system": "System",
  "controls.theme": "Theme",
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
  "messages.noSearchBody": "Try another name, role, or message keyword.",
  "messages.noSearchTitle": "No matching conversations",
  "messages.openConversation": "Open conversation",
  "messages.search": "Search conversations",
  "messages.title": "Messages",
  "messages.unread": "{{count}} unread",
  "location.currentLocationFailed":
    "Could not detect your current location. Please allow location access and try again.",
  "location.currentLocation": "Current location",
  "location.mustSelect":
    "Select a location from suggestions or use current location.",
  "location.popularSuggestions": "Suggested places in Yemen",
  "location.searchPlaceholder": "Search a city or address in Yemen",
  "location.useCurrentLocation": "Use current location",
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
  "onboarding.chooseImage": "Choose image",
  "onboarding.noRequiredDocumentsBody":
    "The backend currently has no missing documents for your account.",
  "onboarding.noRequiredDocumentsTitle": "No required documents",
  "onboarding.profileSetup": "Profile setup",
  "onboarding.profileSetupBody":
    "Complete your image, location, contact details, and qualifications before submitting for review.",
  "onboarding.profileChecklist": "Profile checklist",
  "onboarding.fileRequirements": "PDF or image, up to {{count}} MB.",
  "onboarding.next": "Next",
  "onboarding.previous": "Previous",
  "onboarding.required": "required",
  "onboarding.requiredBeforeSubmit": "Required before submitting your account.",
  "onboarding.reviewBlocked":
    "Complete the required profile items and documents before submitting for admin review.",
  "onboarding.saveDraft": "Save draft",
  "onboarding.saved": "Changes saved.",
  "onboarding.submitReview": "Submit for admin review",
  "onboarding.stepContact": "Contact",
  "onboarding.stepProfile": "Profile",
  "onboarding.stepDocuments": "Documents",
  "onboarding.title": "Onboarding",
  "onboarding.uploadDocument": "Upload document",
  "onboarding.uploadFailed": "Upload failed. Please try again.",
  "onboarding.uploaded": "uploaded",
  "onboarding.uploadedReview": "Uploaded and ready for review.",
  "profile.bio": "Bio",
  "profile.accountSecurity": "Account security",
  "profile.availability": "Availability",
  "profile.availability.available": "Available",
  "profile.availability.limited": "Limited",
  "profile.availability.unavailable": "Unavailable",
  "profile.changePassword": "Change password",
  "profile.confirmPassword": "Confirm new password",
  "profile.certifications": "Certifications and qualifications",
  "profile.commaSeparated": "Separate values with commas",
  "profile.currentPassword": "Current password",
  "profile.emailMissing": "Your account email is not available.",
  "profile.emailUnverified": "Your email is not verified yet.",
  "profile.emailVerified": "Your email is verified.",
  "profile.edit": "Edit profile",
  "profile.facilityDescription": "Facility description",
  "profile.facilityType": "Facility type",
  "profile.fullName": "Full name",
  "profile.headline": "Headline",
  "profile.imagePermission": "Allow photo access to upload your image.",
  "profile.languages": "Languages",
  "profile.language.ar": "Arabic",
  "profile.language.en": "English",
  "profile.licenseDetails": "License / certification details",
  "profile.location": "Location",
  "profile.locationHint":
    "Choose a suggested place or use current location. Coordinates are saved for matching.",
  "profile.locationRadius": "Travel radius in km",
  "profile.loading": "Loading profile...",
  "profile.logout": "Log out",
  "profile.newPassword": "New password",
  "profile.noOptions": "No options are configured yet.",
  "profile.notAdded": "Not added yet",
  "profile.onboardingComplete": "Onboarding complete",
  "profile.onboardingIncomplete": "Onboarding incomplete",
  "profile.organizationName": "Organization name",
  "profile.passwordChanged": "Password updated.",
  "profile.passwordLength": "Use at least 8 characters for both passwords.",
  "profile.passwordMismatch": "The new passwords do not match.",
  "profile.profileDetails": "Profile details",
  "profile.radiusError": "Enter a valid positive travel radius.",
  "profile.quickUpdate": "Quick profile update",
  "profile.save": "Save changes",
  "profile.savePassword": "Update password",
  "profile.resendVerification": "Resend verification email",
  "profile.services": "Services",
  "profile.specialty": "Specialty",
  "profile.specialtyRequired": "Select your specialty.",
  "profile.title": "Profile",
  "profile.uploadLogo": "Upload logo",
  "profile.uploadPhoto": "Upload photo",
  "profile.verificationSent": "Verification email requested.",
  "profile.website": "Website",
  "profile.yemenFixed": "Yemen is fixed for launch: +967 only.",
  "profile.yemenPhone": "Yemeni phone number",
  "profile.yemenPhoneError":
    "Enter a valid Yemeni number starting with 71, 73, 77, or 78.",
  "profile.yearsPlaceholder": "Example: 3",
  "profile.yearsError": "Enter valid years of experience.",
  "profile.yearsExperience": "Years of experience",
  "shifts.alreadyApplied": "Already applied",
  "shifts.back": "Back",
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
  "shifts.endTime": "End time",
  "shifts.hourlyRate": "Hourly rate",
  "shifts.inviteBody":
    "Verified professionals can be opened from the backend directory.",
  "shifts.inviteTitle": "Invite or message professionals",
  "shifts.loading": "Loading shifts...",
  "shifts.loadingCertifications": "Loading certifications...",
  "shifts.loadingProfessionals": "Loading professionals...",
  "shifts.loadingRoles": "Loading roles...",
  "shifts.location": "Location",
  "shifts.locationPlaceholder": "City, region",
  "shifts.locationRequired": "Enter the shift city or clinic location.",
  "shifts.markUrgent": "Mark as urgent",
  "shifts.next": "Next",
  "shifts.noCertifications": "No matching certifications.",
  "shifts.noOptionalRequirements": "No optional certifications selected",
  "shifts.noApplicationsBody": "Applications for your shifts will appear here.",
  "shifts.noApplicationsTitle": "No applications yet",
  "shifts.noOpenBody":
    "Published shifts from approved clinics will appear here.",
  "shifts.noOpenTitle": "No open shifts",
  "shifts.noRoles": "No matching roles.",
  "shifts.noVerifiedProfessionalsBody":
    "Only approved and onboarded professionals appear here.",
  "shifts.noVerifiedProfessionalsTitle": "No verified professionals",
  "shifts.publishShift": "Publish shift",
  "shifts.proposal": "Proposal",
  "shifts.proposalPlaceholder":
    "Share your availability, experience, or questions.",
  "shifts.verificationRequiredTitle": "Verification required",
  "shifts.verificationRequiredBody":
    "Your profile must be approved before you can apply for shifts.",
  "shifts.waitForVerification": "Waiting for verification",
  "shifts.qualifiedFor": "Qualified for",
  "shifts.requirements": "Requirements",
  "shifts.roleRequired": "Select a role for this shift.",
  "shifts.searchCertifications": "Search certifications",
  "shifts.searchRole": "Search role",
  "shifts.shiftDate": "Shift date",
  "shifts.selectDate": "Select date",
  "shifts.shiftDateRequired": "Enter the shift date.",
  "shifts.shiftDatePast": "Shift date cannot be in the past.",
  "shifts.previousMonth": "Previous month",
  "shifts.nextMonth": "Next month",
  "shifts.shiftTitle": "Shift title",
  "shifts.specialty": "Specialty",
  "shifts.startMessage": "Start message",
  "shifts.startsAt": "Starts at",
  "shifts.startsAtRequired": "Enter a valid start date.",
  "shifts.startTime": "Start time",
  "shifts.summary": "Summary",
  "shifts.submitApplication": "Submit application",
  "shifts.title": "Shifts",
  "shifts.titleRequired": "Enter a shift title.",
  "shifts.urgentCoverage": "Urgent coverage",
  "shifts.urgentHint": "Highlight this shift for fast coverage.",
  "shifts.view.applications": "Applications",
  "shifts.view.professionals": "Professionals",
  "shifts.view.shifts": "Shifts",
  "settings.account": "Account",
  "settings.accountBody": "Manage your session and account access.",
  "settings.preferencesBody":
    "By default SyndeoCare follows your device language and appearance. You can override either option here.",
  "settings.title": "Settings",
  "roles.admin": "Admin",
  "roles.clinic": "Clinic",
  "roles.professional": "Professional",
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
  "verification.approved": "Verified",
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
  "auth.googleCancelledNeutral":
    "تم إلغاء تسجيل الدخول باستخدام Google. يمكنك المتابعة عندما تكون جاهزاً.",
  "auth.googleCompleting": "جاري إكمال تسجيل الدخول باستخدام Google...",
  "auth.googleCloseHint": "يمكنك إغلاق هذه النافذة إذا لم تُغلق تلقائياً.",
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
  "auth.showPassword": "إظهار كلمة المرور",
  "auth.hidePassword": "إخفاء كلمة المرور",
  "auth.startChoice": "اختر طريقة البدء",
  "auth.terms": "بالمتابعة، فإنك توافق على شروط SyndeoCare وسياسة الخصوصية.",
  "auth.welcomeBack": "مرحباً بعودتك",
  "conversation.attachment": "مرفق:",
  "conversation.attachFile": "إرفاق ملف",
  "conversation.composerTitle": "رسالة جديدة",
  "conversation.composerHint": "تتم مشاركة الرسائل والملفات بأمان.",
  "conversation.emptyBody":
    "أرسل أول رسالة عندما تكون جاهزاً لمتابعة المحادثة.",
  "conversation.emptyTitle": "لا توجد رسائل بعد",
  "conversation.loading": "جاري تحميل المحادثة...",
  "conversation.message": "الرسالة",
  "conversation.messagePlaceholder": "اكتب رسالة واضحة...",
  "conversation.removeFile": "إزالة",
  "conversation.send": "إرسال",
  "conversation.secureThread": "محادثة آمنة",
  "conversation.title": "المحادثة",
  "conversation.you": "أنت",
  "common.cancel": "إلغاء",
  "common.clear": "مسح",
  "common.loading": "جاري التحميل...",
  "common.optional": "اختياري",
  "controls.dark": "داكن",
  "controls.deviceLanguage": "الجهاز",
  "controls.english": "English",
  "controls.language": "اللغة",
  "controls.light": "فاتح",
  "controls.system": "النظام",
  "controls.theme": "المظهر",
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
  "messages.noSearchBody": "جرّب اسماً أو دوراً أو كلمة أخرى من الرسائل.",
  "messages.noSearchTitle": "لا توجد محادثات مطابقة",
  "messages.openConversation": "فتح المحادثة",
  "messages.search": "البحث في المحادثات",
  "messages.title": "الرسائل",
  "messages.unread": "{{count}} غير مقروءة",
  "location.currentLocationFailed":
    "تعذر تحديد موقعك الحالي. يرجى السماح بالوصول للموقع والمحاولة مرة أخرى.",
  "location.currentLocation": "الموقع الحالي",
  "location.mustSelect": "اختر موقعاً من الاقتراحات أو استخدم موقعك الحالي.",
  "location.popularSuggestions": "مواقع مقترحة في اليمن",
  "location.searchPlaceholder": "ابحث عن مدينة أو عنوان في اليمن",
  "location.useCurrentLocation": "استخدام موقعي الحالي",
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
  "onboarding.chooseImage": "اختيار صورة",
  "onboarding.noRequiredDocumentsBody":
    "لا توجد حالياً مستندات ناقصة لحسابك في النظام.",
  "onboarding.noRequiredDocumentsTitle": "لا توجد مستندات مطلوبة",
  "onboarding.profileSetup": "إعداد الملف",
  "onboarding.profileSetupBody":
    "أكمل الصورة والموقع وبيانات التواصل والمؤهلات قبل الإرسال للمراجعة.",
  "onboarding.profileChecklist": "قائمة إكمال الملف",
  "onboarding.fileRequirements": "PDF أو صورة حتى {{count}} م.ب.",
  "onboarding.next": "التالي",
  "onboarding.previous": "السابق",
  "onboarding.required": "مطلوب",
  "onboarding.requiredBeforeSubmit": "مطلوب قبل إرسال حسابك.",
  "onboarding.reviewBlocked":
    "أكمل بيانات الملف والمستندات المطلوبة قبل إرسال الحساب لمراجعة الإدارة.",
  "onboarding.saveDraft": "حفظ كمسودة",
  "onboarding.saved": "تم حفظ التغييرات.",
  "onboarding.submitReview": "إرسال لمراجعة الإدارة",
  "onboarding.stepContact": "التواصل",
  "onboarding.stepProfile": "الملف",
  "onboarding.stepDocuments": "المستندات",
  "onboarding.title": "إكمال البيانات",
  "onboarding.uploadDocument": "رفع المستند",
  "onboarding.uploadFailed": "فشل الرفع. يرجى المحاولة مرة أخرى.",
  "onboarding.uploaded": "تم الرفع",
  "onboarding.uploadedReview": "تم الرفع وجاهز للمراجعة.",
  "profile.bio": "نبذة",
  "profile.accountSecurity": "أمان الحساب",
  "profile.availability": "التوفر",
  "profile.availability.available": "متاح",
  "profile.availability.limited": "متاح جزئياً",
  "profile.availability.unavailable": "غير متاح",
  "profile.changePassword": "تغيير كلمة المرور",
  "profile.confirmPassword": "تأكيد كلمة المرور الجديدة",
  "profile.certifications": "الشهادات والمؤهلات",
  "profile.commaSeparated": "افصل القيم بفواصل",
  "profile.currentPassword": "كلمة المرور الحالية",
  "profile.emailMissing": "بريد حسابك غير متوفر.",
  "profile.emailUnverified": "بريدك الإلكتروني غير موثق بعد.",
  "profile.emailVerified": "بريدك الإلكتروني موثق.",
  "profile.edit": "تعديل الملف",
  "profile.facilityDescription": "وصف المنشأة",
  "profile.facilityType": "نوع المنشأة",
  "profile.fullName": "الاسم الكامل",
  "profile.headline": "العنوان المهني",
  "profile.imagePermission": "اسمح بالوصول إلى الصور لرفع الصورة.",
  "profile.languages": "اللغات",
  "profile.language.ar": "العربية",
  "profile.language.en": "الإنجليزية",
  "profile.licenseDetails": "تفاصيل الترخيص / الشهادات",
  "profile.location": "الموقع",
  "profile.locationHint":
    "اختر موقعاً من الاقتراحات أو استخدم موقعك الحالي. سيتم حفظ الإحداثيات للمطابقة.",
  "profile.locationRadius": "نطاق التنقل بالكيلومتر",
  "profile.loading": "جاري تحميل الملف...",
  "profile.logout": "تسجيل الخروج",
  "profile.newPassword": "كلمة المرور الجديدة",
  "profile.noOptions": "لا توجد خيارات مفعلة حالياً.",
  "profile.notAdded": "لم تتم إضافته بعد",
  "profile.onboardingComplete": "اكتمل إدخال البيانات",
  "profile.onboardingIncomplete": "البيانات غير مكتملة",
  "profile.organizationName": "اسم المنشأة",
  "profile.passwordChanged": "تم تحديث كلمة المرور.",
  "profile.passwordLength": "استخدم 8 أحرف على الأقل لكلمتي المرور.",
  "profile.passwordMismatch": "كلمتا المرور الجديدتان غير متطابقتين.",
  "profile.profileDetails": "تفاصيل الملف",
  "profile.radiusError": "أدخل نطاق تنقل صحيحاً أكبر من صفر.",
  "profile.quickUpdate": "تحديث سريع للملف",
  "profile.save": "حفظ التغييرات",
  "profile.savePassword": "تحديث كلمة المرور",
  "profile.resendVerification": "إعادة إرسال رسالة التحقق",
  "profile.services": "الخدمات",
  "profile.specialty": "التخصص",
  "profile.specialtyRequired": "اختر تخصصك.",
  "profile.title": "الملف الشخصي",
  "profile.uploadLogo": "رفع الشعار",
  "profile.uploadPhoto": "رفع الصورة",
  "profile.verificationSent": "تم طلب رسالة التحقق.",
  "profile.website": "الموقع الإلكتروني",
  "profile.yemenFixed": "اليمن ثابت للإطلاق: +967 فقط.",
  "profile.yemenPhone": "رقم الهاتف اليمني",
  "profile.yemenPhoneError":
    "أدخل رقماً يمنياً صحيحاً يبدأ بـ 71 أو 73 أو 77 أو 78.",
  "profile.yearsPlaceholder": "مثال: ٣",
  "profile.yearsError": "أدخل سنوات خبرة صحيحة.",
  "profile.yearsExperience": "سنوات الخبرة",
  "shifts.alreadyApplied": "تم التقديم مسبقاً",
  "shifts.back": "رجوع",
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
  "shifts.endTime": "وقت الانتهاء",
  "shifts.hourlyRate": "الأجر بالساعة",
  "shifts.inviteBody": "يمكن فتح ملفات المختصين الموثقين من دليل النظام.",
  "shifts.inviteTitle": "دعوة أو مراسلة المختصين",
  "shifts.loading": "جاري تحميل المناوبات...",
  "shifts.loadingCertifications": "جاري تحميل الشهادات...",
  "shifts.loadingProfessionals": "جاري تحميل المختصين...",
  "shifts.loadingRoles": "جاري تحميل الأدوار...",
  "shifts.location": "الموقع",
  "shifts.locationPlaceholder": "المدينة، المحافظة",
  "shifts.locationRequired": "أدخل مدينة المناوبة أو موقع المنشأة.",
  "shifts.markUrgent": "تحديد كمناوبة عاجلة",
  "shifts.next": "التالي",
  "shifts.noCertifications": "لا توجد شهادات مطابقة.",
  "shifts.noOptionalRequirements": "لا توجد شهادات اختيارية محددة",
  "shifts.noApplicationsBody": "ستظهر هنا طلبات التقديم على مناوباتك.",
  "shifts.noApplicationsTitle": "لا توجد طلبات بعد",
  "shifts.noOpenBody": "ستظهر هنا المناوبات المنشورة من المنشآت المعتمدة.",
  "shifts.noOpenTitle": "لا توجد مناوبات مفتوحة",
  "shifts.noRoles": "لا توجد أدوار مطابقة.",
  "shifts.noVerifiedProfessionalsBody":
    "يظهر هنا فقط المختصون المعتمدون والمكتملو البيانات.",
  "shifts.noVerifiedProfessionalsTitle": "لا يوجد مختصون معتمدون",
  "shifts.publishShift": "نشر المناوبة",
  "shifts.proposal": "العرض",
  "shifts.proposalPlaceholder": "شارك تفرغك أو خبرتك أو أسئلتك.",
  "shifts.verificationRequiredTitle": "التحقق مطلوب",
  "shifts.verificationRequiredBody":
    "يجب اعتماد ملفك أولاً قبل التقديم على المناوبات.",
  "shifts.waitForVerification": "بانتظار التحقق",
  "shifts.qualifiedFor": "مؤهل لـ",
  "shifts.requirements": "المتطلبات",
  "shifts.roleRequired": "اختر الدور المطلوب لهذه المناوبة.",
  "shifts.searchCertifications": "البحث في الشهادات",
  "shifts.searchRole": "البحث عن الدور",
  "shifts.shiftDate": "تاريخ المناوبة",
  "shifts.selectDate": "اختر التاريخ",
  "shifts.shiftDateRequired": "أدخل تاريخ المناوبة.",
  "shifts.shiftDatePast": "لا يمكن أن يكون تاريخ المناوبة في الماضي.",
  "shifts.previousMonth": "الشهر السابق",
  "shifts.nextMonth": "الشهر التالي",
  "shifts.shiftTitle": "عنوان المناوبة",
  "shifts.specialty": "التخصص",
  "shifts.startMessage": "بدء رسالة",
  "shifts.startsAt": "تبدأ في",
  "shifts.startsAtRequired": "أدخل تاريخ بداية صحيحاً.",
  "shifts.startTime": "وقت البداية",
  "shifts.summary": "الملخص",
  "shifts.submitApplication": "إرسال الطلب",
  "shifts.title": "المناوبات",
  "shifts.titleRequired": "أدخل عنوان المناوبة.",
  "shifts.urgentCoverage": "تغطية عاجلة",
  "shifts.urgentHint": "إبراز هذه المناوبة للحصول على تغطية أسرع.",
  "shifts.view.applications": "الطلبات",
  "shifts.view.professionals": "المختصون",
  "shifts.view.shifts": "المناوبات",
  "settings.account": "الحساب",
  "settings.accountBody": "إدارة الجلسة والوصول إلى الحساب.",
  "settings.preferencesBody":
    "يتبع SyndeoCare لغة ومظهر جهازك افتراضياً. يمكنك تغيير أي خيار من هنا.",
  "settings.title": "الإعدادات",
  "roles.admin": "مدير",
  "roles.clinic": "منشأة",
  "roles.professional": "مختص صحي",
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
  "verification.approved": "موثق",
};

const dictionary: Record<AppLanguage, Record<TranslationKey, string>> = {
  ar,
  en,
};

type StoredPreferences = {
  language?: AppLanguagePreference;
  theme?: AppThemePreference;
};

type PreferencesContextValue = {
  direction: AppDirection;
  language: AppLanguage;
  languagePreference: AppLanguagePreference;
  setLanguage: (language: AppLanguage) => void;
  setLanguagePreference: (language: AppLanguagePreference) => void;
  setTheme: (theme: AppTheme) => void;
  setThemePreference: (theme: AppThemePreference) => void;
  theme: AppTheme;
  themePreference: AppThemePreference;
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

function getDeviceLanguage(): AppLanguage {
  const locale =
    Platform.OS === "web"
      ? globalThis.navigator?.languages?.[0] || globalThis.navigator?.language
      : Intl.DateTimeFormat().resolvedOptions().locale;

  return locale?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function resolveLanguage(preference: AppLanguagePreference): AppLanguage {
  return preference === "device" ? getDeviceLanguage() : preference;
}

function resolveTheme(
  preference: AppThemePreference,
  systemScheme?: "dark" | "light" | null,
): AppTheme {
  if (preference !== "system") return preference;
  return systemScheme === "dark" ? "dark" : "light";
}

function normalizeColorScheme(
  value: ReturnType<typeof Appearance.getColorScheme>,
) {
  return value === "dark" || value === "light" ? value : null;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [appearanceScheme, setAppearanceScheme] = useState<
    "dark" | "light" | null
  >(normalizeColorScheme(Appearance.getColorScheme()));
  const [languagePreference, setLanguagePreferenceState] =
    useState<AppLanguagePreference>("device");
  const [themePreference, setThemePreferenceState] =
    useState<AppThemePreference>("system");
  const systemScheme = colorScheme ?? appearanceScheme;
  const language = resolveLanguage(languagePreference);
  const theme = resolveTheme(themePreference, systemScheme);

  useEffect(() => {
    I18nManager.allowRTL(true);
    void loadPreferences().then((stored) => {
      if (
        stored.language === "ar" ||
        stored.language === "en" ||
        stored.language === "device"
      ) {
        setLanguagePreferenceState(stored.language);
      }
      if (
        stored.theme === "dark" ||
        stored.theme === "light" ||
        stored.theme === "system"
      ) {
        setThemePreferenceState(stored.theme);
      }
    });
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      setAppearanceScheme(normalizeColorScheme(Appearance.getColorScheme()));
      if (languagePreference === "device") {
        setLanguagePreferenceState("device");
      }
    });

    return () => subscription.remove();
  }, [languagePreference]);

  const persist = useCallback(
    (next: StoredPreferences) => {
      void savePreferences({
        language: next.language ?? languagePreference,
        theme: next.theme ?? themePreference,
      });
    },
    [languagePreference, themePreference],
  );

  const setLanguagePreference = useCallback(
    (nextLanguage: AppLanguagePreference) => {
      setLanguagePreferenceState(nextLanguage);
      persist({ language: nextLanguage });
    },
    [persist],
  );

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      setLanguagePreference(nextLanguage);
    },
    [setLanguagePreference],
  );

  const setThemePreference = useCallback(
    (nextTheme: AppThemePreference) => {
      setThemePreferenceState(nextTheme);
      persist({ theme: nextTheme });
    },
    [persist],
  );

  const setTheme = useCallback(
    (nextTheme: AppTheme) => {
      setThemePreference(nextTheme);
    },
    [setThemePreference],
  );

  const value = useMemo<PreferencesContextValue>(() => {
    const direction: AppDirection = language === "ar" ? "rtl" : "ltr";
    return {
      direction,
      language,
      languagePreference,
      setLanguage,
      setLanguagePreference,
      setTheme,
      setThemePreference,
      theme,
      themePreference,
      toggleLanguage: () => setLanguage(language === "ar" ? "en" : "ar"),
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      t: (key, fallback) => dictionary[language][key] ?? fallback ?? key,
    };
  }, [
    language,
    languagePreference,
    setLanguage,
    setLanguagePreference,
    setTheme,
    setThemePreference,
    theme,
    themePreference,
  ]);

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

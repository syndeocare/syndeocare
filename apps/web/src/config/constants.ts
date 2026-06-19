// =====================================================
// CENTRALIZED CONFIGURATION - All app constants in one place
// Change values here to update across the entire application
// =====================================================

/**
 * Site configuration - Brand and general settings
 */
export const SITE_CONFIG = {
  name: "SyndeoCare",
  tagline: "Healthcare Staffing, Simplified",
  description:
    "Connect healthcare professionals with facilities seamlessly across Yemen",
  url: "https://syndeocare.ai",
  supportEmail: "support@syndeocare.ai",
  supportPhone: "+967-77-000-0000",
  location: "Sana'a, Yemen",
  country: "Yemen",
  countryCode: "YE",
  phonePrefix: "+967",
  currency: "YER",
  currencySymbol: "ر.ي",
} as const;

/**
 * Platform statistics are intentionally not displayed pre-launch.
 * Re-introduce real numbers once we have verified traction data.
 */
export const PLATFORM_STATS = {} as const;

/**
 * Authentication configuration
 */
export const AUTH_CONFIG = {
  // Dynamic redirect URL — works on any deployment target
  get redirectUrl() {
    return typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "https://syndeocare.ai/auth/callback";
  },
  get emailVerificationRedirectUrl() {
    return typeof window !== "undefined"
      ? `${window.location.origin}/verify-callback`
      : "https://syndeocare.ai/verify-callback";
  },
  get passwordResetRedirectUrl() {
    return typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : "https://syndeocare.ai/reset-password";
  },
  // Dynamic site URL
  get siteUrl() {
    return typeof window !== "undefined"
      ? window.location.origin
      : "https://syndeocare.ai";
  },
  // Minimum password length
  minPasswordLength: 8,
} as const;

/**
 * UI Configuration - Design system constants
 */
export const UI_CONFIG = {
  // Animation durations (seconds)
  animationDuration: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
  },
  // Border radius values
  borderRadius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "2.5rem",
  },
  // Container max widths
  containerMaxWidth: "1400px",
  // Minimum touch target size for mobile (in pixels)
  minTouchTarget: 44,
} as const;

/**
 * Navigation links - Centralized nav configuration
 */
export const NAV_LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/shifts", labelKey: "nav.findShifts" },
  { href: "/for-professionals", labelKey: "nav.forProfessionals" },
  { href: "/for-clinics", labelKey: "nav.forClinics" },
  { href: "/about", labelKey: "nav.about" },
] as const;

/**
 * Social media links
 */
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/syndeocare",
  linkedin: "https://linkedin.com/company/syndeocare",
  instagram: "https://instagram.com/syndeocare",
} as const;

/**
 * Feature flags - Enable/disable features
 */
export const FEATURES = {
  darkMode: true,
  googleAuth: true,
  emailVerification:
    import.meta.env.VITE_EMAIL_VERIFICATION_REQUIRED === "true",
  realTimeUpdates: true,
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  // Default pagination limit
  defaultPageSize: 20,
  // Maximum file upload size (in bytes) - 10MB
  maxFileSize: 10 * 1024 * 1024,
  // Allowed file types for documents
  allowedDocumentTypes: ["pdf", "docx", "jpg", "jpeg", "png", "webp"],
  // Allowed file types for avatars
  allowedAvatarTypes: ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"],
} as const;

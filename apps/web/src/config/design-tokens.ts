// =============================================================================
// DESIGN TOKENS - Single Source of Truth for All Design Values
// =============================================================================
// This file centralizes all design decisions. Change values here to update
// throughout the entire application. Never hardcode these values in components.

/**
 * Spacing scale - consistent spacing across all components
 * Based on 4px grid system for visual harmony
 */
export const SPACING = {
  /** 4px */
  xs: "0.25rem",
  /** 8px */
  sm: "0.5rem",
  /** 12px */
  md: "0.75rem",
  /** 16px */
  base: "1rem",
  /** 24px */
  lg: "1.5rem",
  /** 32px */
  xl: "2rem",
  /** 48px */
  "2xl": "3rem",
  /** 64px */
  "3xl": "4rem",
  /** 80px - Standard section padding on mobile */
  section: "5rem",
  /** 96px */
  "4xl": "6rem",
  /** 128px - Large section padding on desktop */
  "5xl": "8rem",
} as const;

/**
 * Touch target sizes - following Apple HIG & Material Design guidelines
 * Minimum 44x44px for accessible touch targets
 */
export const TOUCH_TARGETS = {
  /** 44px - Absolute minimum for accessibility */
  min: 44,
  /** 48px - Comfortable touch target */
  comfortable: 48,
  /** 52px - Large touch target for primary actions */
  large: 52,
  /** 56px - Extra large for hero CTAs */
  xl: 56,
} as const;

/**
 * Typography scale - consistent text sizing
 * Uses a modular scale of 1.125 (major second)
 */
export const TYPOGRAPHY = {
  fontFamily: {
    sans: "'Ubuntu', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabic: "'Cairo', 'Ubuntu', system-ui, sans-serif",
  },
  sizes: {
    /** 12px */
    xs: "0.75rem",
    /** 14px */
    sm: "0.875rem",
    /** 16px - Base size, default for body text */
    base: "1rem",
    /** 18px */
    lg: "1.125rem",
    /** 20px */
    xl: "1.25rem",
    /** 24px */
    "2xl": "1.5rem",
    /** 30px */
    "3xl": "1.875rem",
    /** 36px */
    "4xl": "2.25rem",
    /** 48px */
    "5xl": "3rem",
    /** 60px */
    "6xl": "3.75rem",
  },
  lineHeight: {
    /** 1.15 - Tight for large headings */
    tight: 1.15,
    /** 1.25 - Snug for medium headings */
    snug: 1.25,
    /** 1.5 - Normal for body text */
    normal: 1.5,
    /** 1.625 - Relaxed for easier reading */
    relaxed: 1.625,
    /** 2 - Loose for special cases */
    loose: 2,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

/**
 * Animation timing - consistent motion across the app
 * Follows Material Design motion principles
 */
export const ANIMATION = {
  duration: {
    /** 0ms - Instant, no animation */
    instant: "0ms",
    /** 100ms - Micro-interactions (button press) */
    micro: "100ms",
    /** 150ms - Fast transitions (hover states) */
    fast: "150ms",
    /** 200ms - Quick transitions */
    quick: "200ms",
    /** 300ms - Standard transitions */
    normal: "300ms",
    /** 400ms - Medium transitions (modal open) */
    medium: "400ms",
    /** 500ms - Slow transitions (page transitions) */
    slow: "500ms",
    /** 700ms - Very slow (complex animations) */
    slower: "700ms",
  },
  easing: {
    /** Standard ease for most transitions */
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Ease-in for exits */
    in: "cubic-bezier(0.4, 0, 1, 1)",
    /** Ease-out for entrances */
    out: "cubic-bezier(0, 0, 0.2, 1)",
    /** Bounce effect for playful interactions */
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    /** Spring effect for natural motion */
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
} as const;

/**
 * Border radius scale
 */
export const BORDER_RADIUS = {
  /** 4px */
  sm: "0.25rem",
  /** 6px */
  md: "0.375rem",
  /** 8px */
  DEFAULT: "0.5rem",
  /** 12px */
  lg: "0.75rem",
  /** 16px */
  xl: "1rem",
  /** 24px */
  "2xl": "1.5rem",
  /** 32px */
  "3xl": "2rem",
  /** 9999px - Full/pill */
  full: "9999px",
} as const;

/**
 * Z-index scale - consistent stacking order
 */
export const Z_INDEX = {
  /** Behind everything */
  behind: -1,
  /** Default stacking */
  base: 0,
  /** Raised elements */
  raised: 10,
  /** Dropdown menus */
  dropdown: 100,
  /** Sticky headers */
  sticky: 200,
  /** Fixed elements */
  fixed: 500,
  /** Modals and dialogs */
  modal: 1000,
  /** Popovers and tooltips */
  popover: 1100,
  /** Toast notifications */
  toast: 1200,
  /** Maximum priority */
  max: 9999,
} as const;

/**
 * Breakpoints - match Tailwind defaults
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1400,
} as const;

/**
 * Container widths
 */
export const CONTAINER = {
  /** Maximum content width */
  maxWidth: "1400px",
  /** Standard horizontal padding */
  padding: {
    mobile: "1rem",
    tablet: "1.5rem",
    desktop: "2rem",
  },
} as const;

/**
 * Icon sizes - consistent icon scaling
 */
export const ICON_SIZES = {
  /** 16px - Small inline icons */
  xs: 16,
  /** 20px - Default inline icons */
  sm: 20,
  /** 24px - Standard icons */
  md: 24,
  /** 28px - Larger icons */
  lg: 28,
  /** 32px - Feature icons */
  xl: 32,
  /** 40px - Hero icons */
  "2xl": 40,
  /** 48px - Display icons */
  "3xl": 48,
} as const;

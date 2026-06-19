// =====================================================
// THEME CONFIGURATION - SyndeoCare Brand Colors
// Based on Logo: Green (#7CB53D) and Teal (#3BC4C3)
// =====================================================

/**
 * Color palette in HSL format
 * All colors are defined here and used in index.css
 */
export const THEME_COLORS = {
  light: {
    // Primary: Brand Green (from logo)
    primary: { h: 87, s: 52, l: 47 },
    primaryForeground: { h: 0, s: 0, l: 100 },

    // Secondary: Light Green tint
    secondary: { h: 87, s: 30, l: 95 },
    secondaryForeground: { h: 87, s: 52, l: 30 },

    // Accent: Brand Teal (from logo)
    accent: { h: 179, s: 53, l: 50 },
    accentForeground: { h: 0, s: 0, l: 100 },

    // Sky Blue (complementary)
    sky: { h: 199, s: 89, l: 48 },
    skyForeground: { h: 0, s: 0, l: 100 },

    // Success: Teal (matches brand)
    success: { h: 160, s: 84, l: 39 },
    successForeground: { h: 0, s: 0, l: 100 },

    // Warning: Warm Amber
    warning: { h: 38, s: 92, l: 50 },
    warningForeground: { h: 0, s: 0, l: 100 },

    // Destructive: Red
    destructive: { h: 0, s: 84, l: 60 },
    destructiveForeground: { h: 0, s: 0, l: 100 },

    // Background & Foreground
    background: { h: 0, s: 0, l: 100 },
    foreground: { h: 220, s: 20, l: 18 },

    // Card
    card: { h: 0, s: 0, l: 100 },
    cardForeground: { h: 220, s: 20, l: 18 },

    // Muted
    muted: { h: 87, s: 10, l: 96 },
    mutedForeground: { h: 220, s: 15, l: 42 },

    // Border & Input
    border: { h: 87, s: 10, l: 90 },
    input: { h: 87, s: 10, l: 90 },
    ring: { h: 87, s: 52, l: 47 },
  },
  dark: {
    // Primary: Brighter Green for dark mode
    primary: { h: 87, s: 60, l: 55 },
    primaryForeground: { h: 0, s: 0, l: 100 },

    // Secondary: Dark Green
    secondary: { h: 87, s: 25, l: 18 },
    secondaryForeground: { h: 87, s: 50, l: 70 },

    // Accent: Brighter Teal
    accent: { h: 179, s: 55, l: 55 },
    accentForeground: { h: 0, s: 0, l: 100 },

    // Sky Blue (brighter for dark mode)
    sky: { h: 199, s: 89, l: 55 },
    skyForeground: { h: 0, s: 0, l: 100 },

    // Success
    success: { h: 160, s: 75, l: 45 },
    successForeground: { h: 220, s: 20, l: 8 },

    // Warning
    warning: { h: 38, s: 85, l: 55 },
    warningForeground: { h: 220, s: 20, l: 8 },

    // Destructive
    destructive: { h: 0, s: 72, l: 55 },
    destructiveForeground: { h: 0, s: 0, l: 100 },

    // Background & Foreground (Dark charcoal)
    background: { h: 220, s: 20, l: 8 },
    foreground: { h: 210, s: 40, l: 98 },

    // Card
    card: { h: 220, s: 18, l: 11 },
    cardForeground: { h: 210, s: 40, l: 98 },

    // Muted
    muted: { h: 220, s: 15, l: 16 },
    mutedForeground: { h: 220, s: 18, l: 68 },

    // Border & Input
    border: { h: 220, s: 15, l: 18 },
    input: { h: 220, s: 15, l: 18 },
    ring: { h: 87, s: 60, l: 55 },
  },
} as const;

/**
 * Brand colors extracted from logo
 */
export const BRAND_COLORS = {
  green: {
    50: "#F3F9EC",
    100: "#E4F2D4",
    200: "#C9E5AA",
    300: "#ADD87F",
    400: "#92CB55",
    500: "#7CB53D", // Primary brand green
    600: "#629130",
    700: "#4A6D24",
    800: "#314918",
    900: "#19240C",
  },
  teal: {
    50: "#ECFCFC",
    100: "#D4F7F6",
    200: "#AAF0EE",
    300: "#7FE8E5",
    400: "#55E0DD",
    500: "#3BC4C3", // Primary brand teal
    600: "#2F9D9C",
    700: "#237675",
    800: "#174F4E",
    900: "#0C2827",
  },
} as const;

/**
 * Gradient definitions using brand colors
 */
export const GRADIENTS = {
  // Primary gradient (green)
  primary:
    "linear-gradient(135deg, hsl(87, 52%, 47%) 0%, hsl(87, 52%, 35%) 100%)",
  // Secondary gradient (teal)
  secondary:
    "linear-gradient(135deg, hsl(179, 53%, 50%) 0%, hsl(179, 53%, 40%) 100%)",
  // Brand gradient (green to teal - signature gradient)
  brand:
    "linear-gradient(135deg, hsl(87, 52%, 47%) 0%, hsl(179, 53%, 50%) 100%)",
  // Hero gradient (dark professional)
  hero: "linear-gradient(155deg, hsl(220, 20%, 12%) 0%, hsl(220, 25%, 18%) 50%, hsl(220, 20%, 12%) 100%)",
  // Sky gradient (complementary)
  sky: "linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(185, 85%, 45%) 100%)",
  // Accent gradient (teal)
  accent:
    "linear-gradient(135deg, hsl(179, 53%, 50%) 0%, hsl(160, 84%, 39%) 100%)",
} as const;

/**
 * Shadow definitions
 */
export const SHADOWS = {
  sm: "0 1px 2px 0 hsl(220 20% 18% / 0.05)",
  md: "0 4px 6px -1px hsl(220 20% 18% / 0.08), 0 2px 4px -2px hsl(220 20% 18% / 0.05)",
  lg: "0 10px 15px -3px hsl(220 20% 18% / 0.1), 0 4px 6px -4px hsl(220 20% 18% / 0.05)",
  xl: "0 20px 25px -5px hsl(220 20% 18% / 0.12), 0 8px 10px -6px hsl(220 20% 18% / 0.06)",
  card: "0 1px 3px hsl(220 20% 18% / 0.06), 0 1px 2px -1px hsl(220 20% 18% / 0.06)",
  glow: "0 0 20px hsl(87 52% 47% / 0.25)",
  glowTeal: "0 0 20px hsl(179 53% 50% / 0.25)",
} as const;

/**
 * Theme type
 */
export type Theme = "light" | "dark" | "system";

/**
 * Get system theme preference
 */
export const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

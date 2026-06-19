/**
 * ============================================================================
 * DESIGN TOKENS - PRIMITIVES LAYER (DTCG Standard)
 * ============================================================================
 *
 * Raw design values with no semantic meaning.
 * These are the foundational building blocks of the design system.
 *
 * Standard: W3C Design Tokens Community Group (DTCG)
 * Format: Design Tokens Format Module (DTF)
 *
 * @see https://design-tokens.github.io/community-group/format/
 */

export const primitives = {
  $type: "primitives",
  $description: "SyndeoCare Design System - Primitive Tokens",

  color: {
    $type: "color",

    // ===== BRAND GREENS (Primary) =====
    green: {
      50: { $value: "hsl(87, 30%, 95%)", $description: "Lightest green tint" },
      100: { $value: "hsl(87, 35%, 90%)", $description: "Very light green" },
      200: { $value: "hsl(87, 40%, 80%)", $description: "Light green" },
      300: { $value: "hsl(87, 45%, 70%)", $description: "Medium light green" },
      400: { $value: "hsl(87, 50%, 60%)", $description: "Medium green" },
      500: {
        $value: "hsl(87, 52%, 47%)",
        $description: "Primary brand green - #7CB53D",
      },
      600: { $value: "hsl(87, 52%, 40%)", $description: "Dark green" },
      700: { $value: "hsl(87, 52%, 35%)", $description: "Darker green" },
      800: { $value: "hsl(87, 55%, 25%)", $description: "Very dark green" },
      900: { $value: "hsl(87, 60%, 15%)", $description: "Darkest green" },
    },

    // ===== BRAND TEALS (Accent) =====
    teal: {
      50: { $value: "hsl(179, 35%, 95%)", $description: "Lightest teal" },
      100: { $value: "hsl(179, 40%, 88%)", $description: "Very light teal" },
      200: { $value: "hsl(179, 45%, 75%)", $description: "Light teal" },
      300: { $value: "hsl(179, 48%, 65%)", $description: "Medium light teal" },
      400: { $value: "hsl(179, 50%, 55%)", $description: "Medium teal" },
      500: {
        $value: "hsl(179, 53%, 50%)",
        $description: "Primary brand teal - #3BC4C3",
      },
      600: { $value: "hsl(179, 53%, 42%)", $description: "Dark teal" },
      700: { $value: "hsl(179, 55%, 35%)", $description: "Darker teal" },
      800: { $value: "hsl(179, 58%, 25%)", $description: "Very dark teal" },
      900: { $value: "hsl(179, 60%, 15%)", $description: "Darkest teal" },
    },

    // ===== NEUTRALS =====
    neutral: {
      0: { $value: "hsl(0, 0%, 100%)", $description: "Pure white" },
      50: { $value: "hsl(210, 40%, 98%)", $description: "Near white" },
      100: { $value: "hsl(210, 30%, 96%)", $description: "Light gray" },
      200: { $value: "hsl(214, 20%, 92%)", $description: "Lighter gray" },
      300: { $value: "hsl(213, 18%, 85%)", $description: "Light gray" },
      400: { $value: "hsl(215, 16%, 70%)", $description: "Medium gray" },
      500: { $value: "hsl(215, 14%, 55%)", $description: "Gray" },
      600: { $value: "hsl(215, 16%, 42%)", $description: "Dark gray" },
      700: { $value: "hsl(217, 18%, 30%)", $description: "Darker gray" },
      800: { $value: "hsl(220, 20%, 18%)", $description: "Very dark gray" },
      900: { $value: "hsl(220, 22%, 12%)", $description: "Near black" },
      950: { $value: "hsl(220, 25%, 8%)", $description: "Darkest" },
    },

    // ===== STATUS COLORS =====
    red: {
      50: { $value: "hsl(0, 86%, 97%)", $description: "Lightest red" },
      100: { $value: "hsl(0, 85%, 94%)", $description: "Very light red" },
      400: { $value: "hsl(0, 80%, 65%)", $description: "Medium red" },
      500: { $value: "hsl(0, 84%, 60%)", $description: "Primary red" },
      600: { $value: "hsl(0, 72%, 50%)", $description: "Dark red" },
      700: { $value: "hsl(0, 74%, 42%)", $description: "Darker red" },
    },

    amber: {
      50: { $value: "hsl(48, 100%, 96%)", $description: "Lightest amber" },
      100: { $value: "hsl(48, 96%, 89%)", $description: "Very light amber" },
      400: { $value: "hsl(43, 96%, 56%)", $description: "Medium amber" },
      500: { $value: "hsl(38, 92%, 50%)", $description: "Primary amber" },
      600: { $value: "hsl(32, 95%, 44%)", $description: "Dark amber" },
      700: { $value: "hsl(26, 90%, 37%)", $description: "Darker amber" },
    },

    emerald: {
      50: { $value: "hsl(152, 81%, 96%)", $description: "Lightest emerald" },
      100: { $value: "hsl(149, 80%, 90%)", $description: "Very light emerald" },
      400: { $value: "hsl(158, 64%, 52%)", $description: "Medium emerald" },
      500: { $value: "hsl(160, 84%, 39%)", $description: "Primary emerald" },
      600: { $value: "hsl(161, 94%, 30%)", $description: "Dark emerald" },
      700: { $value: "hsl(163, 94%, 24%)", $description: "Darker emerald" },
    },

    sky: {
      50: { $value: "hsl(204, 100%, 97%)", $description: "Lightest sky" },
      100: { $value: "hsl(204, 94%, 94%)", $description: "Very light sky" },
      400: { $value: "hsl(198, 93%, 60%)", $description: "Medium sky" },
      500: { $value: "hsl(199, 89%, 48%)", $description: "Primary sky" },
      600: { $value: "hsl(200, 98%, 39%)", $description: "Dark sky" },
      700: { $value: "hsl(201, 96%, 32%)", $description: "Darker sky" },
    },
  },

  // ===== TYPOGRAPHY =====
  fontFamily: {
    $type: "fontFamily",
    sans: {
      $value: ["DM Sans", "system-ui", "sans-serif"],
      $description: "Primary font for English",
    },
    arabic: {
      $value: ["Cairo", "DM Sans", "sans-serif"],
      $description: "Font for Arabic content",
    },
    mono: {
      $value: ["JetBrains Mono", "Consolas", "monospace"],
      $description: "Monospace font",
    },
  },

  fontSize: {
    $type: "dimension",
    xs: { $value: "0.75rem", $description: "12px" },
    sm: { $value: "0.875rem", $description: "14px" },
    base: { $value: "1rem", $description: "16px" },
    lg: { $value: "1.125rem", $description: "18px" },
    xl: { $value: "1.25rem", $description: "20px" },
    "2xl": { $value: "1.5rem", $description: "24px" },
    "3xl": { $value: "1.875rem", $description: "30px" },
    "4xl": { $value: "2.25rem", $description: "36px" },
    "5xl": { $value: "3rem", $description: "48px" },
    "6xl": { $value: "3.75rem", $description: "60px" },
  },

  fontWeight: {
    $type: "fontWeight",
    light: { $value: 300, $description: "Light weight" },
    normal: { $value: 400, $description: "Normal weight" },
    medium: { $value: 500, $description: "Medium weight" },
    semibold: { $value: 600, $description: "Semibold weight" },
    bold: { $value: 700, $description: "Bold weight" },
  },

  lineHeight: {
    $type: "number",
    none: { $value: 1, $description: "No line height" },
    tight: { $value: 1.25, $description: "Tight line height" },
    snug: { $value: 1.375, $description: "Snug line height" },
    normal: { $value: 1.5, $description: "Normal line height" },
    relaxed: { $value: 1.625, $description: "Relaxed line height" },
    loose: { $value: 2, $description: "Loose line height" },
  },

  // ===== SPACING (4px base grid) =====
  spacing: {
    $type: "dimension",
    0: { $value: "0", $description: "No spacing" },
    px: { $value: "1px", $description: "1 pixel" },
    0.5: { $value: "0.125rem", $description: "2px" },
    1: { $value: "0.25rem", $description: "4px" },
    1.5: { $value: "0.375rem", $description: "6px" },
    2: { $value: "0.5rem", $description: "8px" },
    2.5: { $value: "0.625rem", $description: "10px" },
    3: { $value: "0.75rem", $description: "12px" },
    3.5: { $value: "0.875rem", $description: "14px" },
    4: { $value: "1rem", $description: "16px" },
    5: { $value: "1.25rem", $description: "20px" },
    6: { $value: "1.5rem", $description: "24px" },
    7: { $value: "1.75rem", $description: "28px" },
    8: { $value: "2rem", $description: "32px" },
    9: { $value: "2.25rem", $description: "36px" },
    10: { $value: "2.5rem", $description: "40px" },
    11: { $value: "2.75rem", $description: "44px - min touch target" },
    12: { $value: "3rem", $description: "48px - comfortable touch" },
    14: { $value: "3.5rem", $description: "56px" },
    16: { $value: "4rem", $description: "64px" },
    20: { $value: "5rem", $description: "80px" },
    24: { $value: "6rem", $description: "96px" },
    32: { $value: "8rem", $description: "128px" },
    40: { $value: "10rem", $description: "160px" },
    48: { $value: "12rem", $description: "192px" },
    56: { $value: "14rem", $description: "224px" },
    64: { $value: "16rem", $description: "256px" },
  },

  // ===== BORDER RADIUS =====
  borderRadius: {
    $type: "dimension",
    none: { $value: "0", $description: "No radius" },
    sm: { $value: "0.25rem", $description: "4px - small" },
    md: { $value: "0.375rem", $description: "6px - medium" },
    lg: { $value: "0.5rem", $description: "8px - large" },
    xl: { $value: "0.75rem", $description: "12px - extra large" },
    "2xl": { $value: "1rem", $description: "16px" },
    "3xl": { $value: "1.5rem", $description: "24px" },
    full: { $value: "9999px", $description: "Pill shape" },
  },

  // ===== SHADOWS =====
  shadow: {
    $type: "shadow",
    sm: {
      $value: {
        offsetX: "0",
        offsetY: "1px",
        blur: "2px",
        spread: "0",
        color: "rgba(0, 0, 0, 0.05)",
      },
      $description: "Small shadow",
    },
    md: {
      $value: {
        offsetX: "0",
        offsetY: "4px",
        blur: "6px",
        spread: "-1px",
        color: "rgba(0, 0, 0, 0.08)",
      },
      $description: "Medium shadow",
    },
    lg: {
      $value: {
        offsetX: "0",
        offsetY: "10px",
        blur: "15px",
        spread: "-3px",
        color: "rgba(0, 0, 0, 0.1)",
      },
      $description: "Large shadow",
    },
    xl: {
      $value: {
        offsetX: "0",
        offsetY: "20px",
        blur: "25px",
        spread: "-5px",
        color: "rgba(0, 0, 0, 0.12)",
      },
      $description: "Extra large shadow",
    },
  },

  // ===== ANIMATION =====
  duration: {
    $type: "duration",
    instant: { $value: "0ms", $description: "Instant" },
    fast: { $value: "100ms", $description: "Fast" },
    normal: { $value: "200ms", $description: "Normal" },
    slow: { $value: "300ms", $description: "Slow" },
    slower: { $value: "500ms", $description: "Slower" },
  },

  easing: {
    $type: "cubicBezier",
    linear: { $value: [0, 0, 1, 1], $description: "Linear" },
    easeIn: { $value: [0.4, 0, 1, 1], $description: "Ease in" },
    easeOut: { $value: [0, 0, 0.2, 1], $description: "Ease out" },
    easeInOut: { $value: [0.4, 0, 0.2, 1], $description: "Ease in-out" },
    spring: {
      $value: [0.68, -0.55, 0.265, 1.55],
      $description: "Spring bounce",
    },
  },

  // ===== Z-INDEX =====
  zIndex: {
    $type: "number",
    base: { $value: 0, $description: "Base level" },
    dropdown: { $value: 10, $description: "Dropdowns" },
    sticky: { $value: 20, $description: "Sticky elements" },
    fixed: { $value: 30, $description: "Fixed elements" },
    overlay: { $value: 40, $description: "Overlays" },
    modal: { $value: 50, $description: "Modals" },
    popover: { $value: 60, $description: "Popovers" },
    tooltip: { $value: 70, $description: "Tooltips" },
    toast: { $value: 80, $description: "Toasts" },
  },
} as const;

export type Primitives = typeof primitives;

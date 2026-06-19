/**
 * ============================================================================
 * DESIGN TOKENS - SEMANTIC LAYER (DTCG Standard)
 * ============================================================================
 *
 * Intent-based tokens that map primitive values to meaningful use cases.
 * These tokens describe WHAT something is, not HOW it looks.
 *
 * Example: "action.primary" instead of "green.500"
 *
 * @see https://design-tokens.github.io/community-group/format/
 */

import { primitives } from "./primitives";

export const semantics = {
  $type: "semantics",
  $description: "SyndeoCare Design System - Semantic Tokens",

  // ===== LIGHT THEME =====
  light: {
    // ----- SURFACE COLORS -----
    surface: {
      background: {
        $value: "{primitives.color.neutral.0}",
        $description: "Page background",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      foreground: {
        $value: "{primitives.color.neutral.800}",
        $description: "Primary text",
        resolvedValue: primitives.color.neutral[800].$value,
      },
      card: {
        $value: "{primitives.color.neutral.0}",
        $description: "Card background",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      muted: {
        $value: "{primitives.color.green.50}",
        $description: "Muted background",
        resolvedValue: primitives.color.green[50].$value,
      },
      secondary: {
        $value: "{primitives.color.green.50}",
        $description: "Secondary background",
        resolvedValue: primitives.color.green[50].$value,
      },
    },

    // ----- ACTION COLORS -----
    action: {
      primary: {
        $value: "{primitives.color.green.500}",
        $description: "Primary action color",
        resolvedValue: primitives.color.green[500].$value,
      },
      primaryHover: {
        $value: "{primitives.color.green.600}",
        $description: "Primary hover state",
        resolvedValue: primitives.color.green[600].$value,
      },
      primaryForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on primary",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      secondary: {
        $value: "{primitives.color.teal.500}",
        $description: "Secondary/accent action",
        resolvedValue: primitives.color.teal[500].$value,
      },
      secondaryHover: {
        $value: "{primitives.color.teal.600}",
        $description: "Secondary hover state",
        resolvedValue: primitives.color.teal[600].$value,
      },
      secondaryForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on secondary",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      destructive: {
        $value: "{primitives.color.red.500}",
        $description: "Dangerous action",
        resolvedValue: primitives.color.red[500].$value,
      },
      destructiveForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on destructive",
        resolvedValue: primitives.color.neutral[0].$value,
      },
    },

    // ----- FEEDBACK COLORS -----
    feedback: {
      success: {
        $value: "{primitives.color.emerald.500}",
        $description: "Success state",
        resolvedValue: primitives.color.emerald[500].$value,
      },
      successForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on success",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      successMuted: {
        $value: "{primitives.color.emerald.50}",
        $description: "Success background",
        resolvedValue: primitives.color.emerald[50].$value,
      },
      warning: {
        $value: "{primitives.color.amber.500}",
        $description: "Warning state",
        resolvedValue: primitives.color.amber[500].$value,
      },
      warningForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on warning",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      warningMuted: {
        $value: "{primitives.color.amber.50}",
        $description: "Warning background",
        resolvedValue: primitives.color.amber[50].$value,
      },
      error: {
        $value: "{primitives.color.red.500}",
        $description: "Error state",
        resolvedValue: primitives.color.red[500].$value,
      },
      errorForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on error",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      errorMuted: {
        $value: "{primitives.color.red.50}",
        $description: "Error background",
        resolvedValue: primitives.color.red[50].$value,
      },
      info: {
        $value: "{primitives.color.sky.500}",
        $description: "Info state",
        resolvedValue: primitives.color.sky[500].$value,
      },
      infoForeground: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on info",
        resolvedValue:
          primitives.color.sky[0]?.$value || primitives.color.neutral[0].$value,
      },
      infoMuted: {
        $value: "{primitives.color.sky.50}",
        $description: "Info background",
        resolvedValue: primitives.color.sky[50].$value,
      },
    },

    // ----- BORDER COLORS -----
    border: {
      default: {
        $value: "{primitives.color.green.100}",
        $description: "Default border",
        resolvedValue: primitives.color.green[100].$value,
      },
      muted: {
        $value: "{primitives.color.neutral.200}",
        $description: "Subtle border",
        resolvedValue: primitives.color.neutral[200].$value,
      },
      focus: {
        $value: "{primitives.color.green.500}",
        $description: "Focus ring",
        resolvedValue: primitives.color.green[500].$value,
      },
    },

    // ----- TEXT COLORS -----
    text: {
      primary: {
        $value: "{primitives.color.neutral.800}",
        $description: "Primary text",
        resolvedValue: primitives.color.neutral[800].$value,
      },
      secondary: {
        $value: "{primitives.color.neutral.600}",
        $description: "Secondary text",
        resolvedValue: primitives.color.neutral[600].$value,
      },
      muted: {
        $value: "{primitives.color.neutral.500}",
        $description: "Muted text",
        resolvedValue: primitives.color.neutral[500].$value,
      },
      disabled: {
        $value: "{primitives.color.neutral.400}",
        $description: "Disabled text",
        resolvedValue: primitives.color.neutral[400].$value,
      },
      inverse: {
        $value: "{primitives.color.neutral.0}",
        $description: "Text on dark bg",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      brand: {
        $value: "{primitives.color.green.500}",
        $description: "Brand colored text",
        resolvedValue: primitives.color.green[500].$value,
      },
      link: {
        $value: "{primitives.color.green.600}",
        $description: "Link text",
        resolvedValue: primitives.color.green[600].$value,
      },
    },
  },

  // ===== DARK THEME =====
  dark: {
    surface: {
      background: {
        $value: "{primitives.color.neutral.950}",
        resolvedValue: primitives.color.neutral[950].$value,
      },
      foreground: {
        $value: "{primitives.color.neutral.50}",
        resolvedValue: primitives.color.neutral[50].$value,
      },
      card: {
        $value: "{primitives.color.neutral.900}",
        resolvedValue: primitives.color.neutral[900].$value,
      },
      muted: {
        $value: "{primitives.color.neutral.800}",
        resolvedValue: primitives.color.neutral[800].$value,
      },
      secondary: {
        $value: "{primitives.color.green.900}",
        resolvedValue: primitives.color.green[900].$value,
      },
    },
    action: {
      primary: {
        $value: "{primitives.color.green.400}",
        resolvedValue: primitives.color.green[400].$value,
      },
      primaryHover: {
        $value: "{primitives.color.green.300}",
        resolvedValue: primitives.color.green[300].$value,
      },
      primaryForeground: {
        $value: "{primitives.color.neutral.950}",
        resolvedValue: primitives.color.neutral[950].$value,
      },
      secondary: {
        $value: "{primitives.color.teal.400}",
        resolvedValue: primitives.color.teal[400].$value,
      },
      secondaryHover: {
        $value: "{primitives.color.teal.300}",
        resolvedValue: primitives.color.teal[300].$value,
      },
      secondaryForeground: {
        $value: "{primitives.color.neutral.950}",
        resolvedValue: primitives.color.neutral[950].$value,
      },
      destructive: {
        $value: "{primitives.color.red.400}",
        resolvedValue: primitives.color.red[400].$value,
      },
      destructiveForeground: {
        $value: "{primitives.color.neutral.0}",
        resolvedValue: primitives.color.neutral[0].$value,
      },
    },
    feedback: {
      success: {
        $value: "{primitives.color.emerald.400}",
        resolvedValue: primitives.color.emerald[400].$value,
      },
      successForeground: {
        $value: "{primitives.color.neutral.950}",
        resolvedValue: primitives.color.neutral[950].$value,
      },
      successMuted: {
        $value: "{primitives.color.emerald.700}",
        resolvedValue: primitives.color.emerald[700].$value,
      },
      warning: {
        $value: "{primitives.color.amber.400}",
        resolvedValue: primitives.color.amber[400].$value,
      },
      warningForeground: {
        $value: "{primitives.color.neutral.950}",
        resolvedValue: primitives.color.neutral[950].$value,
      },
      warningMuted: {
        $value: "{primitives.color.amber.700}",
        resolvedValue: primitives.color.amber[700].$value,
      },
      error: {
        $value: "{primitives.color.red.400}",
        resolvedValue: primitives.color.red[400].$value,
      },
      errorForeground: {
        $value: "{primitives.color.neutral.0}",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      errorMuted: {
        $value: "{primitives.color.red.700}",
        resolvedValue: primitives.color.red[700].$value,
      },
      info: {
        $value: "{primitives.color.sky.400}",
        resolvedValue: primitives.color.sky[400].$value,
      },
      infoForeground: {
        $value: "{primitives.color.neutral.0}",
        resolvedValue: primitives.color.neutral[0].$value,
      },
      infoMuted: {
        $value: "{primitives.color.sky.700}",
        resolvedValue: primitives.color.sky[700].$value,
      },
    },
    border: {
      default: {
        $value: "{primitives.color.neutral.700}",
        resolvedValue: primitives.color.neutral[700].$value,
      },
      muted: {
        $value: "{primitives.color.neutral.800}",
        resolvedValue: primitives.color.neutral[800].$value,
      },
      focus: {
        $value: "{primitives.color.green.400}",
        resolvedValue: primitives.color.green[400].$value,
      },
    },
    text: {
      primary: {
        $value: "{primitives.color.neutral.50}",
        resolvedValue: primitives.color.neutral[50].$value,
      },
      secondary: {
        $value: "{primitives.color.neutral.300}",
        resolvedValue: primitives.color.neutral[300].$value,
      },
      muted: {
        $value: "{primitives.color.neutral.400}",
        resolvedValue: primitives.color.neutral[400].$value,
      },
      disabled: {
        $value: "{primitives.color.neutral.500}",
        resolvedValue: primitives.color.neutral[500].$value,
      },
      inverse: {
        $value: "{primitives.color.neutral.950}",
        resolvedValue: primitives.color.neutral[950].$value,
      },
      brand: {
        $value: "{primitives.color.green.400}",
        resolvedValue: primitives.color.green[400].$value,
      },
      link: {
        $value: "{primitives.color.green.300}",
        resolvedValue: primitives.color.green[300].$value,
      },
    },
  },

  // ===== GRADIENTS =====
  gradient: {
    primary: {
      $value:
        "linear-gradient(135deg, {primitives.color.green.500} 0%, {primitives.color.green.700} 100%)",
      $description: "Primary green gradient",
    },
    secondary: {
      $value:
        "linear-gradient(135deg, {primitives.color.teal.500} 0%, {primitives.color.teal.700} 100%)",
      $description: "Teal accent gradient",
    },
    brand: {
      $value:
        "linear-gradient(135deg, {primitives.color.green.500} 0%, {primitives.color.teal.500} 100%)",
      $description: "Brand signature gradient (Green → Teal)",
    },
    hero: {
      $value:
        "linear-gradient(155deg, {primitives.color.neutral.900} 0%, {primitives.color.neutral.800} 50%, {primitives.color.neutral.900} 100%)",
      $description: "Dark hero section gradient",
    },
  },
} as const;

export type Semantics = typeof semantics;

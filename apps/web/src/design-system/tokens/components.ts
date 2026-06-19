/**
 * ============================================================================
 * DESIGN TOKENS - COMPONENT LAYER (DTCG Standard)
 * ============================================================================
 *
 * Component-specific tokens that define how individual UI elements look.
 * These reference semantic tokens and add component-specific overrides.
 *
 * @see https://design-tokens.github.io/community-group/format/
 */

import { primitives } from "./primitives";

export const components = {
  $type: "components",
  $description: "SyndeoCare Design System - Component Tokens",

  // ===== BUTTON =====
  button: {
    $description: "Button component tokens",

    // Size variants
    size: {
      sm: {
        height: { $value: "{primitives.spacing.9}", $description: "36px" },
        paddingX: { $value: "{primitives.spacing.4}", $description: "16px" },
        fontSize: { $value: "{primitives.fontSize.xs}", $description: "12px" },
        borderRadius: {
          $value: "{primitives.borderRadius.lg}",
          $description: "8px",
        },
      },
      default: {
        height: {
          $value: "{primitives.spacing.11}",
          $description: "44px - WCAG min touch target",
        },
        paddingX: { $value: "{primitives.spacing.5}", $description: "20px" },
        fontSize: { $value: "{primitives.fontSize.sm}", $description: "14px" },
        borderRadius: {
          $value: "{primitives.borderRadius.xl}",
          $description: "12px",
        },
      },
      lg: {
        height: { $value: "{primitives.spacing.12}", $description: "48px" },
        paddingX: { $value: "{primitives.spacing.7}", $description: "28px" },
        fontSize: {
          $value: "{primitives.fontSize.base}",
          $description: "16px",
        },
        borderRadius: {
          $value: "{primitives.borderRadius.xl}",
          $description: "12px",
        },
      },
      xl: {
        height: { $value: "{primitives.spacing.14}", $description: "56px" },
        paddingX: { $value: "{primitives.spacing.8}", $description: "32px" },
        fontSize: {
          $value: "{primitives.fontSize.base}",
          $description: "16px",
        },
        borderRadius: {
          $value: "{primitives.borderRadius.xl}",
          $description: "12px",
        },
      },
    },

    // Variant styles
    variant: {
      default: {
        background: { $value: "{semantics.light.action.primary}" },
        foreground: { $value: "{semantics.light.action.primaryForeground}" },
        border: { $value: "transparent" },
        hoverBackground: { $value: "{semantics.light.action.primaryHover}" },
        shadow: { $value: "{primitives.shadow.md}" },
      },
      secondary: {
        background: { $value: "{semantics.light.surface.secondary}" },
        foreground: { $value: "{primitives.color.green.700}" },
        border: { $value: "transparent" },
        hoverBackground: { $value: "{primitives.color.green.100}" },
        shadow: { $value: "none" },
      },
      outline: {
        background: { $value: "transparent" },
        foreground: { $value: "{semantics.light.text.primary}" },
        border: { $value: "{semantics.light.border.default}" },
        hoverBackground: { $value: "{semantics.light.surface.secondary}" },
        shadow: { $value: "none" },
      },
      ghost: {
        background: { $value: "transparent" },
        foreground: { $value: "{semantics.light.text.secondary}" },
        border: { $value: "transparent" },
        hoverBackground: { $value: "{semantics.light.surface.muted}" },
        shadow: { $value: "none" },
      },
      destructive: {
        background: { $value: "{semantics.light.action.destructive}" },
        foreground: {
          $value: "{semantics.light.action.destructiveForeground}",
        },
        border: { $value: "transparent" },
        hoverBackground: { $value: "{primitives.color.red.600}" },
        shadow: { $value: "{primitives.shadow.md}" },
      },
      hero: {
        background: { $value: "{semantics.gradient.primary}" },
        foreground: { $value: "{primitives.color.neutral.0}" },
        border: { $value: "transparent" },
        shadow: { $value: "{primitives.shadow.xl}" },
      },
      brand: {
        background: { $value: "{semantics.gradient.brand}" },
        foreground: { $value: "{primitives.color.neutral.0}" },
        border: { $value: "transparent" },
        shadow: { $value: "{primitives.shadow.xl}" },
      },
    },

    // States
    state: {
      disabled: {
        opacity: { $value: 0.5 },
        cursor: { $value: "not-allowed" },
      },
      loading: {
        cursor: { $value: "wait" },
      },
    },

    // Animation
    animation: {
      duration: { $value: "{primitives.duration.normal}" },
      easing: { $value: "{primitives.easing.easeOut}" },
      pressScale: { $value: 0.98 },
    },
  },

  // ===== CARD =====
  card: {
    $description: "Card component tokens",

    padding: {
      sm: { $value: "{primitives.spacing.4}" },
      default: { $value: "{primitives.spacing.6}" },
      lg: { $value: "{primitives.spacing.8}" },
    },

    borderRadius: { $value: "{primitives.borderRadius.2xl}" },
    border: { $value: "1px solid {semantics.light.border.muted}" },
    background: { $value: "{semantics.light.surface.card}" },
    shadow: { $value: "{primitives.shadow.sm}" },

    hover: {
      shadow: { $value: "{primitives.shadow.lg}" },
      borderColor: { $value: "{primitives.color.green.200}" },
      transform: { $value: "translateY(-2px)" },
    },

    animation: {
      duration: { $value: "{primitives.duration.slow}" },
      easing: { $value: "{primitives.easing.easeOut}" },
    },
  },

  // ===== INPUT =====
  input: {
    $description: "Input component tokens",

    height: {
      sm: { $value: "{primitives.spacing.9}" },
      default: { $value: "{primitives.spacing.11}" },
      lg: { $value: "52px" },
    },

    paddingX: { $value: "{primitives.spacing.4}" },
    borderRadius: { $value: "{primitives.borderRadius.xl}" },
    fontSize: { $value: "{primitives.fontSize.base}" },

    border: {
      default: { $value: "{semantics.light.border.default}" },
      focus: { $value: "{semantics.light.action.primary}" },
      error: { $value: "{semantics.light.feedback.error}" },
      success: { $value: "{semantics.light.feedback.success}" },
    },

    background: {
      default: { $value: "{semantics.light.surface.background}" },
      disabled: { $value: "{semantics.light.surface.muted}" },
    },

    placeholder: {
      color: { $value: "{semantics.light.text.muted}" },
    },

    focus: {
      ringWidth: { $value: "2px" },
      ringColor: { $value: "{semantics.light.action.primary}" },
      ringOffset: { $value: "2px" },
    },
  },

  // ===== BADGE =====
  badge: {
    $description: "Badge component tokens",

    paddingX: { $value: "{primitives.spacing.2.5}" },
    paddingY: { $value: "{primitives.spacing.0.5}" },
    borderRadius: { $value: "{primitives.borderRadius.full}" },
    fontSize: { $value: "{primitives.fontSize.xs}" },
    fontWeight: { $value: "{primitives.fontWeight.semibold}" },

    variant: {
      default: {
        background: { $value: "{semantics.light.action.primary}" },
        foreground: { $value: "{semantics.light.action.primaryForeground}" },
      },
      secondary: {
        background: { $value: "{semantics.light.surface.secondary}" },
        foreground: { $value: "{primitives.color.green.700}" },
      },
      success: {
        background: { $value: "{semantics.light.feedback.success}" },
        foreground: { $value: "{semantics.light.feedback.successForeground}" },
      },
      warning: {
        background: { $value: "{semantics.light.feedback.warning}" },
        foreground: { $value: "{semantics.light.feedback.warningForeground}" },
      },
      destructive: {
        background: { $value: "{semantics.light.feedback.error}" },
        foreground: { $value: "{semantics.light.feedback.errorForeground}" },
      },
      outline: {
        background: { $value: "transparent" },
        foreground: { $value: "{semantics.light.text.primary}" },
        border: { $value: "{semantics.light.border.default}" },
      },
    },
  },

  // ===== AVATAR =====
  avatar: {
    $description: "Avatar component tokens",

    size: {
      xs: { $value: "{primitives.spacing.6}" },
      sm: { $value: "{primitives.spacing.8}" },
      default: { $value: "{primitives.spacing.10}" },
      lg: { $value: "{primitives.spacing.12}" },
      xl: { $value: "{primitives.spacing.16}" },
      "2xl": { $value: "{primitives.spacing.20}" },
    },

    borderRadius: { $value: "{primitives.borderRadius.full}" },
    fallbackBackground: { $value: "{semantics.light.surface.muted}" },
    fallbackForeground: { $value: "{semantics.light.text.secondary}" },
  },

  // ===== SKELETON =====
  skeleton: {
    $description: "Skeleton loader tokens",

    background: { $value: "{semantics.light.surface.muted}" },
    shimmer: {
      gradient: {
        $value:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
      },
      duration: { $value: "1.5s" },
    },
    borderRadius: { $value: "{primitives.borderRadius.lg}" },
  },

  // ===== TOAST =====
  toast: {
    $description: "Toast notification tokens",

    padding: { $value: "{primitives.spacing.4}" },
    borderRadius: { $value: "{primitives.borderRadius.xl}" },
    shadow: { $value: "{primitives.shadow.lg}" },

    variant: {
      default: { background: { $value: "{semantics.light.surface.card}" } },
      success: { background: { $value: "{semantics.light.feedback.success}" } },
      error: { background: { $value: "{semantics.light.feedback.error}" } },
      warning: { background: { $value: "{semantics.light.feedback.warning}" } },
    },

    animation: {
      enter: { duration: { $value: "{primitives.duration.slow}" } },
      exit: { duration: { $value: "{primitives.duration.normal}" } },
    },
  },

  // ===== SIDEBAR =====
  sidebar: {
    $description: "Sidebar component tokens",

    width: {
      collapsed: { $value: "56px" },
      expanded: { $value: "240px" },
    },

    background: { $value: "{primitives.color.neutral.900}" },
    foreground: { $value: "{primitives.color.neutral.100}" },
    border: { $value: "{primitives.color.neutral.800}" },

    item: {
      paddingX: { $value: "{primitives.spacing.3}" },
      paddingY: { $value: "{primitives.spacing.2.5}" },
      borderRadius: { $value: "{primitives.borderRadius.lg}" },
      activeBackground: { $value: "{primitives.color.green.500}" },
      activeForeground: { $value: "{primitives.color.neutral.0}" },
      hoverBackground: { $value: "{primitives.color.neutral.800}" },
    },
  },
} as const;

export type Components = typeof components;

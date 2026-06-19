/**
 * ============================================================================
 * MACHINE-READABLE EXPORT - Design Tokens JSON
 * ============================================================================
 *
 * Exports the design system as JSON for:
 * - AI agents (MCP-ready format)
 * - Figma plugins
 * - Style Dictionary
 * - Native app platforms
 *
 * Format: W3C Design Tokens Community Group (DTCG)
 */

import { designTokens } from "../tokens";
import {
  runAccessibilityAudit,
  ariaPatterns,
} from "../accessibility/wcag-checks";

/**
 * Generate complete design system export
 */
export function generateDesignSystemExport() {
  const audit = runAccessibilityAudit();

  return {
    // Schema and metadata
    $schema: "https://design-tokens.github.io/community-group/format/",
    $version: "1.0.0",

    meta: {
      name: "SyndeoCare Design System",
      description:
        "Healthcare platform design system with Green & Teal brand identity",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),

      brand: {
        name: "SyndeoCare",
        primaryColor: "#7CB53D",
        accentColor: "#3BC4C3",
        fonts: {
          primary: "DM Sans",
          arabic: "Cairo",
        },
      },

      platforms: {
        web: { status: "production", framework: "React + Tailwind" },
        ios: { status: "planned", framework: "SwiftUI" },
        android: { status: "planned", framework: "Jetpack Compose" },
      },

      themes: ["light", "dark"],
      languages: ["en", "ar"],
      rtlSupport: true,

      accessibility: {
        wcagLevel: "AA",
        auditResults: audit.summary,
        lastAuditDate: audit.timestamp,
      },
    },

    // Token layers
    tokens: {
      primitives: designTokens.primitives,
      semantics: designTokens.semantics,
      components: designTokens.components,
    },

    // Accessibility documentation
    accessibility: {
      colorContrast: audit.colorContrast,
      touchTargets: audit.touchTargets,
      focusIndicators: audit.focusIndicators,
      ariaPatterns,
    },

    // Component documentation for AI agents
    componentGuide: {
      Button: {
        description: "Primary interactive element for user actions",
        variants: [
          "default",
          "secondary",
          "outline",
          "ghost",
          "destructive",
          "hero",
          "brand",
        ],
        sizes: ["sm", "default", "lg", "xl", "icon"],
        usage: {
          primaryAction: { variant: "hero", size: "lg" },
          secondaryAction: { variant: "outline", size: "default" },
          dangerousAction: { variant: "destructive", size: "default" },
          formSubmit: { variant: "default", size: "default" },
        },
        accessibility: {
          minTouchTarget: "44x44px",
          focusVisible: true,
          ariaSupport: ["aria-disabled", "aria-pressed", "aria-expanded"],
        },
      },

      Card: {
        description: "Container for grouped content",
        variants: ["default", "interactive"],
        usage: {
          content: { interactive: false },
          clickable: { interactive: true },
        },
        accessibility: {
          semanticHTML: "article or section",
          headingStructure: "CardTitle should be h2-h6",
        },
      },

      Badge: {
        description: "Status indicator and label component",
        variants: [
          "default",
          "secondary",
          "destructive",
          "outline",
          "success",
          "warning",
          "info",
          "urgent",
        ],
        roleVariants: [
          "role-nurse",
          "role-dentist",
          "role-hygienist",
          "role-assistant",
        ],
        usage: {
          status: { variant: "success | warning | destructive" },
          label: { variant: "secondary" },
          urgent: { variant: "urgent" },
        },
      },

      Input: {
        description: "Form input field",
        features: ["icons", "validation", "password strength"],
        sizes: ["sm", "default", "lg"],
        accessibility: {
          labelRequired: true,
          errorAnnouncement: "aria-describedby",
          invalidState: "aria-invalid",
        },
      },

      Toast: {
        description: "Notification feedback component",
        variants: ["default", "success", "error", "warning", "info"],
        accessibility: {
          role: "alert",
          ariaLive: "polite | assertive",
        },
      },
    },

    // Usage guidelines for AI agents
    guidelines: {
      spacing: {
        rule: "Use 4px base grid",
        touchTargets: "Minimum 44x44px for interactive elements",
        sectionSpacing: "py-16 (mobile) / py-32 (desktop)",
      },

      typography: {
        headings: "Use heading-1 through heading-4 utility classes",
        body: "Use body-large, body-default, body-small",
        arabic: "Apply dir='rtl' and Cairo font for Arabic content",
      },

      colors: {
        rule: "Never use raw color values in components",
        tokens:
          "Always reference semantic tokens (action.primary, feedback.error)",
        gradients: "Use gradient-primary, gradient-brand, gradient-accent",
      },

      accessibility: {
        contrast: "Maintain 4.5:1 for text, 3:1 for large text/UI",
        focus: "All interactive elements must have visible focus states",
        motion: "Support prefers-reduced-motion media query",
      },
    },
  };
}

/**
 * Export as JSON string
 */
export function exportAsJSON(): string {
  return JSON.stringify(generateDesignSystemExport(), null, 2);
}

/**
 * Export for Style Dictionary format
 */
export function exportForStyleDictionary() {
  const tokens = designTokens;

  // Convert to Style Dictionary format
  return {
    color: {
      ...tokens.primitives.color,
    },
    size: {
      spacing: tokens.primitives.spacing,
      borderRadius: tokens.primitives.borderRadius,
    },
    font: {
      family: tokens.primitives.fontFamily,
      size: tokens.primitives.fontSize,
      weight: tokens.primitives.fontWeight,
      lineHeight: tokens.primitives.lineHeight,
    },
    time: {
      duration: tokens.primitives.duration,
    },
  };
}

/**
 * Export CSS Custom Properties
 */
export function exportAsCSSVariables(): string {
  const tokens = designTokens.primitives;
  let css = ":root {\n";

  // Colors
  Object.entries(tokens.color).forEach(([colorName, shades]) => {
    if (typeof shades === "object" && !("$value" in shades)) {
      Object.entries(shades).forEach(([shade, token]) => {
        if (typeof token === "object" && "$value" in token) {
          css += `  --color-${colorName}-${shade}: ${token.$value};\n`;
        }
      });
    }
  });

  css += "\n  /* Spacing */\n";
  Object.entries(tokens.spacing).forEach(([key, token]) => {
    if (typeof token === "object" && "$value" in token) {
      css += `  --spacing-${key}: ${token.$value};\n`;
    }
  });

  css += "\n  /* Border Radius */\n";
  Object.entries(tokens.borderRadius).forEach(([key, token]) => {
    if (typeof token === "object" && "$value" in token) {
      css += `  --radius-${key}: ${token.$value};\n`;
    }
  });

  css += "}\n";

  return css;
}

export default {
  generateDesignSystemExport,
  exportAsJSON,
  exportForStyleDictionary,
  exportAsCSSVariables,
};

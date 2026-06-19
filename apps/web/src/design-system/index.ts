/**
 * ============================================================================
 * SYNDEOCARE DESIGN SYSTEM
 * ============================================================================
 *
 * Enterprise-grade design system following 2026 standards:
 *
 * 1. DTCG Token Architecture (Primitives → Semantics → Components)
 * 2. WCAG 2.2 Accessibility Automation
 * 3. Machine-Readable Exports (JSON, CSS, Style Dictionary)
 * 4. Multi-theme Support (Light/Dark)
 * 5. RTL/LTR Support (English/Arabic)
 *
 * @see https://design-tokens.github.io/community-group/format/
 */

// Token Architecture (DTCG Standard)
export * from "./tokens";
export { default as designTokens } from "./tokens";

// Accessibility Automation
export * from "./accessibility/wcag-checks";

// Machine-Readable Exports
export * from "./export/tokens.json";

// Re-export convenience functions
import {
  runAccessibilityAudit,
  ariaPatterns,
} from "./accessibility/wcag-checks";
import {
  generateDesignSystemExport,
  exportAsJSON,
  exportAsCSSVariables,
} from "./export/tokens.json";
import designTokens from "./tokens";

/**
 * Quick access to design system utilities
 */
export const DesignSystem = {
  // Token access
  tokens: designTokens,

  // Accessibility
  audit: runAccessibilityAudit,
  ariaPatterns,

  // Exports
  export: {
    json: exportAsJSON,
    full: generateDesignSystemExport,
    css: exportAsCSSVariables,
  },

  // Metadata
  meta: {
    name: "SyndeoCare Design System",
    version: "1.0.0",
    brand: {
      primary: "#7CB53D",
      accent: "#3BC4C3",
    },
  },
};

export default DesignSystem;

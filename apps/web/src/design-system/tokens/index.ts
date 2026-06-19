/**
 * ============================================================================
 * DESIGN TOKENS - MASTER EXPORT (DTCG Standard)
 * ============================================================================
 *
 * Central export for all design tokens following the W3C Design Tokens
 * Community Group (DTCG) specification.
 *
 * Architecture:
 * 1. Primitives - Raw values (colors, spacing, etc.)
 * 2. Semantics - Intent-based tokens (action.primary, feedback.error)
 * 3. Components - Component-specific tokens (button.size.lg)
 *
 * @see https://design-tokens.github.io/community-group/format/
 */

export { primitives, type Primitives } from "./primitives";
export { semantics, type Semantics } from "./semantics";
export { components, type Components } from "./components";

import { primitives } from "./primitives";
import { semantics } from "./semantics";
import { components } from "./components";

/**
 * Complete Design System Token Bundle
 * Machine-readable format for AI agents and tooling
 */
export const designTokens = {
  $schema: "https://design-tokens.github.io/community-group/format/",
  $version: "1.0.0",
  $name: "SyndeoCare Design System",
  $description:
    "Healthcare platform design tokens - Green & Teal brand identity",

  meta: {
    brand: "SyndeoCare",
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    platforms: ["web", "ios", "android"],
    themes: ["light", "dark"],
    languages: ["en", "ar"],
    rtlSupport: true,
  },

  primitives,
  semantics,
  components,
} as const;

export type DesignTokens = typeof designTokens;

export default designTokens;

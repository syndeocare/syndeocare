// =============================================================================
// PATTERN UTILITIES - Helper functions to apply design patterns consistently
// =============================================================================

import { cn } from "@/lib/utils";
import {
  CARD_PATTERNS,
  BUTTON_PATTERNS,
  SECTION_PATTERNS,
  INPUT_PATTERNS,
  TEXT_PATTERNS,
  TRANSITION_PATTERNS,
  FOCUS_PATTERN,
} from "@/config/patterns";

/**
 * Generate card classes based on variant
 */
export const cardClasses = (
  variant: "default" | "interactive" | "feature" | "elevated" = "default",
  className?: string,
) => {
  const pattern = CARD_PATTERNS[variant];
  const base = cn(pattern.base, pattern.padding, pattern.radius);

  if (variant === "interactive" || variant === "feature") {
    return cn(
      base,
      (pattern as typeof CARD_PATTERNS.interactive).hover,
      className,
    );
  }

  return cn(base, className);
};

/**
 * Generate button size classes
 */
export const buttonSizeClasses = (
  size: keyof typeof BUTTON_PATTERNS = "default",
  className?: string,
) => {
  const pattern = BUTTON_PATTERNS[size];
  return cn(
    pattern.height,
    pattern.padding,
    pattern.text,
    pattern.radius,
    className,
  );
};

/**
 * Generate section classes based on variant
 */
export const sectionClasses = (
  variant: "default" | "compact" | "hero" = "default",
  background?: keyof typeof SECTION_PATTERNS.background,
  className?: string,
) => {
  const spacingPattern = SECTION_PATTERNS[variant];
  return cn(
    spacingPattern.padding,
    spacingPattern.container,
    background && SECTION_PATTERNS.background[background],
    className,
  );
};

/**
 * Generate input classes based on variant
 */
export const inputClasses = (
  variant: "default" | "large" = "default",
  hasError?: boolean,
  className?: string,
) => {
  const pattern = INPUT_PATTERNS[variant];
  return cn(
    pattern.height,
    pattern.padding,
    pattern.text,
    pattern.radius,
    pattern.border,
    pattern.focus,
    hasError && "border-destructive focus-visible:ring-destructive",
    className,
  );
};

/**
 * Generate input icon padding classes
 */
export const inputIconClasses = (
  iconPosition: "start" | "end" | "both" = "start",
) => {
  const patterns = {
    start: INPUT_PATTERNS.withIconStart,
    end: INPUT_PATTERNS.withIconEnd,
    both: INPUT_PATTERNS.withIconBoth,
  };
  const pattern = patterns[iconPosition];
  return cn(pattern.paddingStart, pattern.paddingEnd);
};

/**
 * Generate text classes based on variant
 */
export const textClasses = (
  variant: keyof typeof TEXT_PATTERNS = "body",
  className?: string,
) => {
  return cn(TEXT_PATTERNS[variant], className);
};

/**
 * Touch target utility - ensures minimum touch target size
 */
export const touchTarget = (
  size: "min" | "comfortable" | "large" = "comfortable",
) => {
  const sizes = {
    min: "min-h-[44px] min-w-[44px]",
    comfortable: "min-h-[48px] min-w-[48px]",
    large: "min-h-[52px] min-w-[52px]",
  };
  return sizes[size];
};

/**
 * Generate focus ring classes for accessibility
 */
export const focusRing = (type: "ring" | "visible" = "ring") => {
  return FOCUS_PATTERN[type];
};

/**
 * Generate transition classes
 */
export const transitionClasses = (
  speed: keyof typeof TRANSITION_PATTERNS = "default",
) => {
  return TRANSITION_PATTERNS[speed];
};

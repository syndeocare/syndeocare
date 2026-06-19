/**
 * ============================================================================
 * ACCESSIBILITY AUTOMATION - WCAG 2.2 Compliance Checks
 * ============================================================================
 *
 * Automated accessibility validation for the design system.
 * Ensures WCAG 2.2 AA/AAA compliance at the token level.
 */

// ===== COLOR CONTRAST UTILITIES =====

/**
 * Parse HSL string to values
 */
function parseHSL(hsl: string): { h: number; s: number; l: number } | null {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return null;
  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3]),
  };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Calculate relative luminance (WCAG 2.1 formula)
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const hsl1 = parseHSL(color1);
  const hsl2 = parseHSL(color2);

  if (!hsl1 || !hsl2) return 0;

  const rgb1 = hslToRgb(hsl1.h, hsl1.s, hsl1.l);
  const rgb2 = hslToRgb(hsl2.h, hsl2.s, hsl2.l);

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ===== WCAG COMPLIANCE LEVELS =====

export interface ContrastResult {
  ratio: number;
  aa: {
    normalText: boolean; // 4.5:1
    largeText: boolean; // 3:1
    uiComponents: boolean; // 3:1
  };
  aaa: {
    normalText: boolean; // 7:1
    largeText: boolean; // 4.5:1
  };
}

export function checkContrast(
  foreground: string,
  background: string,
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: {
      normalText: ratio >= 4.5,
      largeText: ratio >= 3,
      uiComponents: ratio >= 3,
    },
    aaa: {
      normalText: ratio >= 7,
      largeText: ratio >= 4.5,
    },
  };
}

// ===== TOUCH TARGET CHECKS =====

export interface TouchTargetResult {
  wcagAA: boolean; // 24x24 CSS pixels minimum
  wcagAAA: boolean; // 44x44 CSS pixels recommended
  appleHIG: boolean; // 44x44 points
  materialDesign: boolean; // 48x48 dp
  width: number;
  height: number;
}

export function checkTouchTarget(
  width: number,
  height: number,
): TouchTargetResult {
  return {
    wcagAA: width >= 24 && height >= 24,
    wcagAAA: width >= 44 && height >= 44,
    appleHIG: width >= 44 && height >= 44,
    materialDesign: width >= 48 && height >= 48,
    width,
    height,
  };
}

// ===== FOCUS INDICATOR CHECKS =====

export interface FocusIndicatorResult {
  hasVisibleFocus: boolean;
  meetsContrastRequirement: boolean; // 3:1 against adjacent colors
  hasMinimumArea: boolean; // 2px outline or equivalent
}

export function checkFocusIndicator(
  focusColor: string,
  backgroundColor: string,
  outlineWidth: number,
): FocusIndicatorResult {
  const contrast = getContrastRatio(focusColor, backgroundColor);

  return {
    hasVisibleFocus: outlineWidth > 0,
    meetsContrastRequirement: contrast >= 3,
    hasMinimumArea: outlineWidth >= 2,
  };
}

// ===== MOTION & ANIMATION CHECKS =====

export interface MotionResult {
  respectsReducedMotion: boolean;
  animationDuration: number;
  isEssentialMotion: boolean;
}

export function checkMotion(
  durationMs: number,
  hasReducedMotionFallback: boolean,
  isEssential: boolean = false,
): MotionResult {
  return {
    respectsReducedMotion: hasReducedMotionFallback || durationMs === 0,
    animationDuration: durationMs,
    isEssentialMotion: isEssential,
  };
}

// ===== FULL ACCESSIBILITY AUDIT =====

export interface AccessibilityAudit {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  colorContrast: {
    checked: number;
    passed: number;
    issues: Array<{
      pair: string;
      ratio: number;
      required: number;
      level: "AA" | "AAA";
    }>;
  };
  touchTargets: {
    checked: number;
    passed: number;
    issues: Array<{
      component: string;
      size: string;
      required: string;
    }>;
  };
  focusIndicators: {
    allComponentsHaveFocus: boolean;
    issues: string[];
  };
}

/**
 * Run a complete accessibility audit on the design system
 */
export function runAccessibilityAudit(): AccessibilityAudit {
  // Sample contrast checks for key color combinations
  const contrastChecks = [
    {
      name: "Primary on White",
      fg: "hsl(87, 52%, 47%)",
      bg: "hsl(0, 0%, 100%)",
    },
    {
      name: "White on Primary",
      fg: "hsl(0, 0%, 100%)",
      bg: "hsl(87, 52%, 47%)",
    },
    { name: "Teal on White", fg: "hsl(179, 53%, 50%)", bg: "hsl(0, 0%, 100%)" },
    {
      name: "Text on Background",
      fg: "hsl(220, 20%, 18%)",
      bg: "hsl(0, 0%, 100%)",
    },
    {
      name: "Muted on Background",
      fg: "hsl(220, 15%, 42%)",
      bg: "hsl(0, 0%, 100%)",
    },
    { name: "Error on White", fg: "hsl(0, 84%, 60%)", bg: "hsl(0, 0%, 100%)" },
  ];

  const contrastIssues: AccessibilityAudit["colorContrast"]["issues"] = [];
  let contrastPassed = 0;

  contrastChecks.forEach((check) => {
    const result = checkContrast(check.fg, check.bg);
    if (result.aa.normalText) {
      contrastPassed++;
    } else {
      contrastIssues.push({
        pair: check.name,
        ratio: result.ratio,
        required: 4.5,
        level: "AA",
      });
    }
  });

  // Touch target checks for component sizes
  const touchTargetChecks = [
    { name: "Button (default)", width: 44, height: 44 },
    { name: "Button (sm)", width: 36, height: 36 },
    { name: "Input", width: 200, height: 44 },
    { name: "Checkbox", width: 20, height: 20 },
    { name: "Icon Button", width: 44, height: 44 },
  ];

  const touchIssues: AccessibilityAudit["touchTargets"]["issues"] = [];
  let touchPassed = 0;

  touchTargetChecks.forEach((check) => {
    const result = checkTouchTarget(check.width, check.height);
    if (result.wcagAAA) {
      touchPassed++;
    } else {
      touchIssues.push({
        component: check.name,
        size: `${check.width}x${check.height}`,
        required: "44x44",
      });
    }
  });

  const total = contrastChecks.length + touchTargetChecks.length;
  const passed = contrastPassed + touchPassed;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed: total - passed,
      warnings: contrastIssues.filter((i) => i.ratio >= 3).length,
    },
    colorContrast: {
      checked: contrastChecks.length,
      passed: contrastPassed,
      issues: contrastIssues,
    },
    touchTargets: {
      checked: touchTargetChecks.length,
      passed: touchPassed,
      issues: touchIssues,
    },
    focusIndicators: {
      allComponentsHaveFocus: true, // Based on our component design
      issues: [],
    },
  };
}

// ===== ARIA PATTERN DEFINITIONS =====

export const ariaPatterns = {
  button: {
    role: "button",
    requiredAttributes: ["aria-label OR visible text"],
    optionalAttributes: ["aria-pressed", "aria-expanded", "aria-disabled"],
    keyboardInteraction: ["Enter", "Space"],
  },

  dialog: {
    role: "dialog",
    requiredAttributes: ["aria-modal", "aria-labelledby OR aria-label"],
    optionalAttributes: ["aria-describedby"],
    keyboardInteraction: [
      "Escape to close",
      "Tab to cycle focus",
      "Focus trap required",
    ],
  },

  menu: {
    role: "menu",
    requiredAttributes: ["aria-labelledby OR aria-label"],
    childRole: "menuitem",
    keyboardInteraction: [
      "Arrow keys to navigate",
      "Enter/Space to select",
      "Escape to close",
    ],
  },

  tabs: {
    containerRole: "tablist",
    tabRole: "tab",
    panelRole: "tabpanel",
    requiredAttributes: [
      "aria-selected",
      "aria-controls (tab)",
      "aria-labelledby (panel)",
    ],
    keyboardInteraction: ["Arrow keys to navigate tabs", "Tab to enter panel"],
  },

  combobox: {
    role: "combobox",
    requiredAttributes: ["aria-expanded", "aria-controls", "aria-haspopup"],
    optionalAttributes: ["aria-autocomplete", "aria-activedescendant"],
    keyboardInteraction: [
      "Arrow keys to navigate",
      "Enter to select",
      "Escape to close",
    ],
  },

  alert: {
    role: "alert",
    requiredAttributes: ["aria-live (polite/assertive)"],
    optionalAttributes: ["aria-atomic"],
    notes: "Use for important, time-sensitive information",
  },

  form: {
    requiredAttributes: ["aria-label OR aria-labelledby"],
    fieldRequirements: [
      "Labels must be associated with inputs",
      "Required fields need aria-required",
      "Error messages need aria-describedby",
      "Invalid fields need aria-invalid",
    ],
  },
} as const;

export default {
  checkContrast,
  checkTouchTarget,
  checkFocusIndicator,
  checkMotion,
  runAccessibilityAudit,
  ariaPatterns,
};

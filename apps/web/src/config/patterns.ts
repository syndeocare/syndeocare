// =============================================================================
// UI PATTERNS - Reusable Component Style Patterns
// =============================================================================
// These patterns define consistent styling for common UI elements.
// Use these patterns in components to maintain visual consistency.

/**
 * Card style patterns - consistent card appearance
 */
export const CARD_PATTERNS = {
  /** Standard card with subtle shadow */
  default: {
    base: "bg-card text-card-foreground border border-border/80 shadow-card",
    padding: "p-6 md:p-7",
    radius: "rounded-2xl",
  },
  /** Interactive card with hover effects */
  interactive: {
    base: "bg-card text-card-foreground border border-border/80 shadow-card",
    padding: "p-6 md:p-7",
    radius: "rounded-2xl md:rounded-3xl",
    hover:
      "hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300",
    focus:
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  },
  /** Feature card with gradient icon */
  feature: {
    base: "bg-card text-card-foreground border border-border/80 shadow-card",
    padding: "p-6 md:p-7",
    radius: "rounded-2xl md:rounded-3xl",
    hover:
      "hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300",
    iconWrapper:
      "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg",
    iconHover: "group-hover:scale-110 transition-transform duration-300",
  },
  /** Elevated card for important content */
  elevated: {
    base: "bg-card text-card-foreground border border-border/50 shadow-lg",
    padding: "p-7 md:p-9",
    radius: "rounded-3xl",
  },
} as const;

/**
 * Button size patterns - consistent button sizing
 */
export const BUTTON_PATTERNS = {
  /** Small buttons for secondary actions */
  sm: {
    height: "h-9",
    padding: "px-4",
    text: "text-sm",
    radius: "rounded-lg",
  },
  /** Default button size */
  default: {
    height: "h-11",
    padding: "px-5",
    text: "text-sm",
    radius: "rounded-xl",
  },
  /** Large buttons for prominent actions */
  lg: {
    height: "h-12",
    padding: "px-7",
    text: "text-base",
    radius: "rounded-xl",
  },
  /** Extra large for hero CTAs */
  xl: {
    height: "h-14",
    padding: "px-8",
    text: "text-base",
    radius: "rounded-xl",
  },
  /** Mobile-optimized touch target */
  mobile: {
    height: "h-13",
    padding: "px-6",
    text: "text-base",
    radius: "rounded-xl",
  },
} as const;

/**
 * Input patterns - consistent form inputs
 */
export const INPUT_PATTERNS = {
  /** Default input styling */
  default: {
    height: "h-12 md:h-11",
    padding: "px-4",
    text: "text-base md:text-sm",
    radius: "rounded-xl",
    border: "border border-input",
    focus:
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  },
  /** Large input for primary forms */
  large: {
    height: "h-13",
    padding: "px-4",
    text: "text-base",
    radius: "rounded-xl",
    border: "border border-input",
    focus:
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  },
  /** Input with icon on start */
  withIconStart: {
    paddingStart: "ps-12",
    paddingEnd: "pe-4",
  },
  /** Input with icon on end */
  withIconEnd: {
    paddingStart: "ps-4",
    paddingEnd: "pe-12",
  },
  /** Input with icons on both sides */
  withIconBoth: {
    paddingStart: "ps-12",
    paddingEnd: "pe-12",
  },
} as const;

/**
 * Section patterns - consistent page sections
 */
export const SECTION_PATTERNS = {
  /** Default section spacing */
  default: {
    padding: "py-16 md:py-24 lg:py-32",
    container: "container mx-auto px-4 sm:px-6",
  },
  /** Compact section for dense content */
  compact: {
    padding: "py-12 md:py-16 lg:py-20",
    container: "container mx-auto px-4 sm:px-6",
  },
  /** Hero section with extra spacing */
  hero: {
    padding: "pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32",
    container: "container mx-auto px-4 sm:px-6",
  },
  /** Full-width section backgrounds */
  background: {
    primary: "bg-background",
    secondary: "bg-secondary",
    muted: "bg-muted",
    gradient: "gradient-hero",
  },
} as const;

/**
 * Typography patterns - consistent text styles
 */
export const TEXT_PATTERNS = {
  /** Page title - largest heading */
  pageTitle:
    "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight",
  /** Section title */
  sectionTitle:
    "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight",
  /** Card title */
  cardTitle: "text-lg md:text-xl font-semibold",
  /** Section subtitle */
  sectionSubtitle:
    "text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed",
  /** Body text */
  body: "text-base text-foreground leading-relaxed",
  /** Small text */
  small: "text-sm text-muted-foreground",
  /** Caption text */
  caption: "text-xs text-muted-foreground",
} as const;

/**
 * Header patterns for section headers
 */
export const HEADER_PATTERNS = {
  /** Centered section header */
  centered: {
    wrapper: "text-center mb-12 md:mb-16 lg:mb-20",
    title:
      "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-5 tracking-tight",
    subtitle:
      "text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4",
  },
  /** Left-aligned section header */
  left: {
    wrapper: "mb-10 md:mb-12",
    title:
      "text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4 tracking-tight",
    subtitle:
      "text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl",
  },
} as const;

/**
 * Grid patterns - consistent grid layouts
 */
export const GRID_PATTERNS = {
  /** 2-column grid */
  cols2: "grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8",
  /** 3-column grid */
  cols3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8",
  /** 4-column grid */
  cols4:
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8",
  /** Auto-fit grid with minimum width */
  autoFit: "grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6",
} as const;

/**
 * Badge patterns
 */
export const BADGE_PATTERNS = {
  /** Default badge */
  default:
    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
  /** Floating badge with backdrop blur */
  floating:
    "inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20",
  /** Stats badge */
  stat: "bg-white/15 backdrop-blur-sm rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4",
} as const;

/**
 * Focus ring pattern for accessibility
 */
export const FOCUS_PATTERN = {
  ring: "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  visible:
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
} as const;

/**
 * Transition patterns
 */
export const TRANSITION_PATTERNS = {
  /** Fast transition for hovers */
  fast: "transition-all duration-150 ease-out",
  /** Default transition */
  default: "transition-all duration-300 ease-out",
  /** Slow transition for complex animations */
  slow: "transition-all duration-500 ease-out",
  /** Transform-only transition for performance */
  transform: "transition-transform duration-300 ease-out",
  /** Opacity-only transition */
  opacity: "transition-opacity duration-300 ease-out",
  /** Colors transition */
  colors: "transition-colors duration-200 ease-out",
} as const;

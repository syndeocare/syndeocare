import * as React from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// SECTION COMPONENT - Consistent page section wrapper
// =============================================================================

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Background variant */
  variant?: "default" | "secondary" | "muted" | "gradient";
  /** Spacing variant */
  spacing?: "default" | "compact" | "hero" | "none";
}

const sectionVariants = {
  default: "bg-background",
  secondary: "bg-secondary",
  muted: "bg-muted",
  gradient: "gradient-hero",
};

const spacingVariants = {
  default: "py-16 md:py-24 lg:py-32",
  compact: "py-12 md:py-16 lg:py-20",
  hero: "pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32",
  none: "",
};

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    { className, variant = "default", spacing = "default", children, ...props },
    ref,
  ) => {
    return (
      <section
        ref={ref}
        className={cn(
          sectionVariants[variant],
          spacingVariants[spacing],
          className,
        )}
        {...props}
      >
        {children}
      </section>
    );
  },
);
Section.displayName = "Section";

// =============================================================================
// SECTION CONTAINER - Content wrapper with consistent padding
// =============================================================================

interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "narrow" | "wide" | "full";
}

const containerSizes = {
  default: "container mx-auto px-4 sm:px-6",
  narrow: "container mx-auto px-4 sm:px-6 max-w-4xl",
  wide: "container mx-auto px-4 sm:px-6 max-w-7xl",
  full: "w-full px-4 sm:px-6",
};

const SectionContainer = React.forwardRef<
  HTMLDivElement,
  SectionContainerProps
>(({ className, size = "default", children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn(containerSizes[size], className)} {...props}>
      {children}
    </div>
  );
});
SectionContainer.displayName = "SectionContainer";

// =============================================================================
// SECTION HEADER - Consistent section titles
// =============================================================================

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  align?: "center" | "left" | "right";
}

const alignmentClasses = {
  center: "text-center mx-auto",
  left: "text-start",
  right: "text-end ms-auto",
};

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ title, subtitle, align = "center", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mb-12 md:mb-16 lg:mb-20 max-w-3xl",
          alignmentClasses[align],
          className,
        )}
        {...props}
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-5 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed px-4 md:px-0">
            {subtitle}
          </p>
        )}
      </div>
    );
  },
);
SectionHeader.displayName = "SectionHeader";

export { Section, SectionContainer, SectionHeader };

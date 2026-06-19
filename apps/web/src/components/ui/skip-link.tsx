import * as React from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// SKIP LINK - Accessibility component for keyboard navigation
// =============================================================================
// Allows keyboard users to skip navigation and jump directly to main content

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Target element ID to skip to */
  targetId?: string;
  /** Link text */
  children?: React.ReactNode;
}

const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    {
      className,
      targetId = "main-content",
      children = "Skip to content",
      ...props
    },
    ref,
  ) => {
    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        className={cn(
          // Hidden by default, visible on focus
          "sr-only focus:not-sr-only",
          // Positioning
          "focus:fixed focus:top-4 focus:left-4 focus:z-[9999]",
          // Styling
          "focus:inline-flex focus:items-center focus:justify-center",
          "focus:px-6 focus:py-3",
          "focus:bg-primary focus:text-primary-foreground",
          "focus:rounded-xl focus:shadow-lg",
          "focus:text-sm focus:font-semibold",
          // Animation
          "focus:animate-in focus:fade-in focus:slide-in-from-top-2",
          // Focus ring
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className,
        )}
        {...props}
      >
        {children}
      </a>
    );
  },
);
SkipLink.displayName = "SkipLink";

export { SkipLink };

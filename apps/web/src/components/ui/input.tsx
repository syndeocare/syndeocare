import * as React from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// INPUT COMPONENT - Accessible, mobile-optimized form input
// =============================================================================
// Features:
// - Minimum 48px height on mobile for touch accessibility (44px+ required)
// - 16px font size on mobile to prevent iOS auto-zoom
// - Consistent focus states with ring
// - RTL support via logical properties

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex w-full rounded-xl border border-input bg-background",
          // Height - 48px on mobile (touch-friendly), 44px on desktop
          "h-12 md:h-11",
          // Padding with logical properties for RTL
          "px-4 py-2",
          // Typography - 16px on mobile prevents iOS zoom, 14px on desktop
          "text-base md:text-sm",
          // Ring offset for focus
          "ring-offset-background",
          // File input styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus state with accessible ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Smooth transitions
          "transition-colors duration-200",
          // Touch manipulation for mobile
          "touch-manipulation",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

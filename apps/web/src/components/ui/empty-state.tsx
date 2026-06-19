import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Empty state component for when there's no data to display
 * Follows accessibility best practices with proper heading hierarchy
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) => {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border shadow-card text-center",
        isCompact ? "p-6" : "p-8 md:p-12",
        className,
      )}
      role="region"
      aria-label={title}
    >
      <div
        className={cn(
          "mx-auto mb-4 flex items-center justify-center rounded-full bg-muted",
          isCompact ? "w-12 h-12" : "w-16 h-16",
        )}
        aria-hidden="true"
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            isCompact ? "w-6 h-6" : "w-8 h-8",
          )}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground mb-2",
          isCompact ? "text-base" : "text-lg",
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-sm mx-auto",
            isCompact ? "text-sm mb-4" : "text-base mb-6",
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

/**
 * Inline empty state for smaller sections
 */
export const InlineEmptyState = ({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon;
  message: string;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-center justify-center gap-2 p-4 text-muted-foreground",
      className,
    )}
  >
    <Icon className="w-4 h-4" aria-hidden="true" />
    <span className="text-sm">{message}</span>
  </div>
);

export default EmptyState;

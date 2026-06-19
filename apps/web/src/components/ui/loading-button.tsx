import * as React from "react";
import { Loader2, Check } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  successText?: string;
}

/**
 * Enhanced button with loading and success states
 * Provides immediate feedback to user actions (UX Principle #5: Feedback Is Mandatory)
 */
export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(
  (
    {
      children,
      isLoading,
      isSuccess,
      loadingText,
      successText,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    // Auto-reset success state after 2 seconds
    const [showSuccess, setShowSuccess] = React.useState(false);

    React.useEffect(() => {
      if (isSuccess) {
        setShowSuccess(true);
        const timer = setTimeout(() => setShowSuccess(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [isSuccess]);

    const displayState = showSuccess
      ? "success"
      : isLoading
        ? "loading"
        : "idle";

    const statusLabel =
      displayState === "loading"
        ? loadingText || "Loading..."
        : displayState === "success"
          ? successText || "Success!"
          : "";
    const buttonContent =
      displayState === "loading" ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : displayState === "success" ? (
        <>
          <Check className="w-4 h-4" />
          {successText && <span>{successText}</span>}
        </>
      ) : (
        children
      );

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          "relative transition-all duration-300",
          showSuccess && "bg-success hover:bg-success",
          className,
        )}
        {...props}
      >
        <span className="flex items-center gap-2 transition-opacity duration-200">
          {buttonContent}
        </span>

        {/* Screen reader announcement */}
        <span className="sr-only" role="status" aria-live="polite">
          {statusLabel}
        </span>
      </Button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";

export default LoadingButton;

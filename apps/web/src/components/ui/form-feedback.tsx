import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type FeedbackVariant = "success" | "error" | "warning" | "info";

interface FormFeedbackProps {
  variant: FeedbackVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const variants = {
  success: {
    icon: CheckCircle2,
    bg: "bg-success/10 border-success/20",
    iconColor: "text-success",
    titleColor: "text-success",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-destructive/10 border-destructive/20",
    iconColor: "text-destructive",
    titleColor: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-warning/10 border-warning/20",
    iconColor: "text-warning",
    titleColor: "text-warning",
  },
  info: {
    icon: Info,
    bg: "bg-primary/10 border-primary/20",
    iconColor: "text-primary",
    titleColor: "text-primary",
  },
};

/**
 * Inline form feedback component for success/error/warning messages
 * UX Principle #5: Feedback Is Mandatory - responsive UI = confidence
 */
export const FormFeedback = ({
  variant,
  title,
  message,
  onDismiss,
  className,
}: FormFeedbackProps) => {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        config.bg,
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon
        className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-semibold text-sm mb-0.5", config.titleColor)}>
            {title}
          </p>
        )}
        <p className="text-sm text-foreground/80">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            "p-1 rounded-lg hover:bg-foreground/10 transition-colors",
            "min-w-[44px] min-h-[44px] flex items-center justify-center -m-2",
          )}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

/**
 * Wrapper for conditional feedback display
 */
export const FormFeedbackContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => <AnimatePresence mode="wait">{children}</AnimatePresence>;

export default FormFeedback;

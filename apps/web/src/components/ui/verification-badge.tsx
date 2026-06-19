import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type VerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | null
  | undefined;

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const VerificationBadge = ({
  status,
  size = "md",
  showLabel = false,
  className,
}: VerificationBadgeProps) => {
  const { t } = useTranslation();

  if (!status) return null;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const config = {
    verified: {
      icon: BadgeCheck,
      color: "text-success",
      bgColor: "bg-success/10",
      label: t("verification.verified"),
    },
    pending: {
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      label: t("verification.pending"),
    },
    rejected: {
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      label: t("verification.rejected"),
    },
  };

  const { icon: Icon, color, bgColor, label } = config[status];

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5",
        showLabel && `px-2 py-0.5 rounded-full ${bgColor}`,
        className,
      )}
    >
      <Icon className={cn(sizeClasses[size], color)} />
      {showLabel && (
        <span className={cn(labelSizeClasses[size], color, "font-medium")}>
          {label}
        </span>
      )}
    </div>
  );

  if (showLabel) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Form field wrapper with consistent styling, labels, and error handling
 * Ensures accessibility with proper label associations and error announcements
 */
export const FormField = ({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) => {
  const { t } = useTranslation();
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive ms-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">{t("common.required")}</span>}
      </Label>

      {React.cloneElement(children as React.ReactElement, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": cn(errorId, hintId) || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

interface InputWithIconProps {
  icon: LucideIcon;
  iconPosition?: "start" | "end";
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper to add icons to form inputs consistently
 */
export const InputWithIcon = ({
  icon: Icon,
  iconPosition = "start",
  children,
  className,
}: InputWithIconProps) => {
  return (
    <div className={cn("relative", className)}>
      <Icon
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none",
          iconPosition === "start" ? "start-4" : "end-4",
        )}
        aria-hidden="true"
      />
      {React.cloneElement(children as React.ReactElement, {
        className: cn(
          (children as React.ReactElement).props.className,
          iconPosition === "start" ? "ps-12" : "pe-12",
        ),
      })}
    </div>
  );
};

export default FormField;

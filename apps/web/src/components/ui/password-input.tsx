import * as React from "react";
import { Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PasswordInputProps extends React.ComponentProps<"input"> {
  showStrength?: boolean;
  value?: string;
}

interface StrengthCheck {
  label: string;
  valid: boolean;
}

/**
 * Password input with visibility toggle and optional strength indicator
 * UX Principle #6: Error Prevention > Error Messages
 * Shows password requirements BEFORE submission
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ showStrength = false, value = "", className, ...props }, ref) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const strengthChecks: StrengthCheck[] = React.useMemo(
    () => [
      {
        label: t(
          "auth.passwordRequirements.minLength",
          "At least 8 characters",
        ),
        valid: value.length >= 8,
      },
      {
        label: t("auth.passwordRequirements.hasNumber", "Contains a number"),
        valid: /\d/.test(value),
      },
      {
        label: t(
          "auth.passwordRequirements.hasUppercase",
          "Contains uppercase",
        ),
        valid: /[A-Z]/.test(value),
      },
    ],
    [value, t],
  );

  const strength = strengthChecks.filter((c) => c.valid).length;
  const strengthPercent = (strength / strengthChecks.length) * 100;
  const strengthColor =
    strengthPercent >= 100
      ? "bg-success"
      : strengthPercent >= 66
        ? "bg-warning"
        : strengthPercent >= 33
          ? "bg-destructive/70"
          : "bg-destructive";

  return (
    <div className="space-y-2">
      <div className="relative">
        <Lock
          className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn("ps-12 pe-12", className)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={cn(
            "absolute end-4 top-1/2 -translate-y-1/2",
            "text-muted-foreground hover:text-foreground transition-colors",
            // 44x44px touch target
            "min-w-[44px] min-h-[44px] flex items-center justify-center -me-2",
          )}
          aria-label={
            showPassword ? t("auth.hidePassword") : t("auth.showPassword")
          }
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Password strength indicator - shows on focus when creating password */}
      {showStrength && isFocused && value.length > 0 && (
        <div
          className="space-y-2 p-3 bg-secondary/50 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200"
          role="status"
          aria-label={t(
            "auth.passwordRequirements.strength",
            "Password strength",
          )}
        >
          {/* Strength bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                strengthColor,
              )}
              style={{ width: `${strengthPercent}%` }}
            />
          </div>

          {/* Requirements list */}
          <ul className="space-y-1">
            {strengthChecks.map((check, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors",
                  check.valid ? "text-success" : "text-muted-foreground",
                )}
              >
                {check.valid ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{check.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;

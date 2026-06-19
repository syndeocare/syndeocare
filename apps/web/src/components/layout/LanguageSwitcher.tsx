import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "icon" | "text" | "full";
  className?: string;
}

const LanguageSwitcher = React.forwardRef<
  HTMLButtonElement | HTMLDivElement,
  LanguageSwitcherProps
>(({ variant = "full", className = "" }, ref) => {
  const { language, toggleLanguage } = useLanguage();

  if (variant === "icon") {
    return (
      <Button
        ref={ref as React.Ref<HTMLButtonElement>}
        variant="ghost"
        size="icon"
        onClick={toggleLanguage}
        className={className}
        aria-label={
          language === "en" ? "Switch to Arabic" : "Switch to English"
        }
      >
        <Globe className="h-5 w-5" />
      </Button>
    );
  }

  if (variant === "text") {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={toggleLanguage}
        className={`text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ${className}`}
      >
        {language === "en" ? "العربية" : "English"}
      </button>
    );
  }

  return (
    <Button
      ref={ref as React.Ref<HTMLButtonElement>}
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={`gap-2 ${className}`}
    >
      <Globe className="h-4 w-4" />
      {language === "en" ? "العربية" : "English"}
    </Button>
  );
});

LanguageSwitcher.displayName = "LanguageSwitcher";

export default LanguageSwitcher;

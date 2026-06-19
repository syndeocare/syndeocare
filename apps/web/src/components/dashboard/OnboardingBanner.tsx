import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Clock, FileText, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OnboardingBannerProps {
  type: "professional" | "clinic";
  onboardingComplete: boolean;
  verificationStatus: string;
  pendingDocuments: number;
  totalDocuments: number;
}

const OnboardingBanner = ({
  type,
  onboardingComplete,
  verificationStatus,
  pendingDocuments,
  totalDocuments,
}: OnboardingBannerProps) => {
  const { t } = useTranslation();

  if (
    onboardingComplete &&
    verificationStatus === "verified" &&
    pendingDocuments === 0
  ) {
    return null;
  }

  const getContent = () => {
    if (!onboardingComplete) {
      return {
        icon: User,
        title: t("onboarding.incomplete"),
        description: t("onboarding.incompleteDesc"),
        action: t("dashboard.completeOnboarding"),
        link:
          type === "professional"
            ? "/onboarding/professional"
            : "/onboarding/clinic",
        color: "warning",
      };
    }

    if (totalDocuments === 0) {
      return {
        icon: FileText,
        title: t("profile.uploadDocument"),
        description: t("dashboard.needsVerification"),
        action: t("dashboard.viewDocuments"),
        link:
          type === "professional"
            ? "/profile/professional?tab=documents"
            : "/profile/clinic?tab=documents",
        color: "destructive",
      };
    }

    if (pendingDocuments > 0) {
      return {
        icon: Clock,
        title: t("onboarding.pendingVerification"),
        description: t("onboarding.pendingVerificationDesc"),
        action: null,
        link: null,
        color: "warning",
      };
    }

    if (verificationStatus === "pending") {
      return {
        icon: Clock,
        title: t("onboarding.pendingVerification"),
        description: t("onboarding.pendingVerificationDesc"),
        action: null,
        link: null,
        color: "warning",
      };
    }

    if (verificationStatus === "rejected") {
      return {
        icon: AlertCircle,
        title: t("common.rejected"),
        description: t("dashboard.needsVerification"),
        action: t("dashboard.viewDocuments"),
        link:
          type === "professional"
            ? "/profile/professional?tab=documents"
            : "/profile/clinic?tab=documents",
        color: "destructive",
      };
    }

    return null;
  };

  const content = getContent();
  if (!content) return null;

  const IconComponent = content.icon;
  const colorClasses = {
    warning: "bg-warning/10 border-warning/20 text-warning",
    destructive: "bg-destructive/10 border-destructive/20 text-destructive",
    primary: "bg-primary/10 border-primary/20 text-primary",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 p-4 md:p-5 rounded-2xl border ${colorClasses[content.color as keyof typeof colorClasses]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center bg-current/10"
          aria-hidden="true"
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-semibold text-foreground">{content.title}</h3>
          <p className="text-sm text-muted-foreground">{content.description}</p>
        </div>
        {content.action && content.link && (
          <Button
            asChild
            size="default"
            variant="outline"
            className="min-h-[44px]"
          >
            <Link to={content.link}>
              {content.action}
              <ArrowRight
                className="w-4 h-4 ms-2 rtl-flip"
                aria-hidden="true"
              />
            </Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default OnboardingBanner;

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { requestEmailVerification } from "@/lib/auth-backend";
import { AUTH_CONFIG } from "@/config/constants";
import BrandLogo from "@/components/brand/BrandLogo";

const EmailVerification = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Get email from navigation state
  const email = location.state?.email || "";

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No email address found. Please try signing up again.",
      });
      return;
    }

    setIsResending(true);
    try {
      await requestEmailVerification(
        email,
        AUTH_CONFIG.emailVerificationRedirectUrl,
      );

      setResent(true);
      toast({
        title: t("auth.verification.emailResent"),
        description: t("auth.verification.checkInbox"),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center mb-8">
          <BrandLogo
            iconClassName="h-14 w-14"
            nameClassName="text-2xl font-semibold"
          />
        </Link>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("auth.verification.checkEmail")}
          </h1>

          <p className="text-muted-foreground mb-2">
            {t("auth.verification.verificationSent")}
          </p>

          {email && <p className="font-medium text-foreground mb-6">{email}</p>}

          <p className="text-sm text-muted-foreground mb-8">
            {t("auth.verification.clickLink")}
          </p>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={isResending || resent}
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : resent ? (
                <CheckCircle className="w-4 h-4 me-2 text-success" />
              ) : null}
              {resent
                ? t("auth.verification.emailResent")
                : t("auth.verification.resendEmail")}
            </Button>

            <Link to="/auth" className="block">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("common.back")} {t("nav.home").toLowerCase()}
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            {t("auth.verification.didntReceive")}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerification;

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import BrandLogo from "@/components/brand/BrandLogo";
import { confirmEmailOtp, requestEmailOtp } from "@/lib/auth-backend";

interface LocationState {
  email?: string;
}

const normalizeOtp = (value: string) => value.replace(/\D/g, "").slice(0, 6);

const VerifyOTP = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as LocationState | null;
  const email = state?.email || "";
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email) {
      navigate("/auth");
      return;
    }

    if (code.length !== 6) {
      setError(t("auth.otp.invalid"));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await confirmEmailOtp(email, code);
      toast({
        title: t("auth.verification.verified"),
        description: t("auth.verification.verifiedDesc"),
      });
      navigate("/auth", { replace: true, state: { email } });
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : t("auth.otp.invalid"),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      navigate("/auth");
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      await requestEmailOtp(email);
      setResent(true);
      toast({
        title: t("auth.otp.codeSent"),
        description: t("auth.otp.checkEmail"),
      });
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : t("common.error"),
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-10 md:py-16 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 me-2" />
            {t("common.back")}
          </Button>
          <LanguageSwitcher variant="text" />
        </div>

        <Link
          to="/"
          className="flex items-center justify-center gap-3 mb-8 group"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="drop-shadow-lg transition-transform"
          >
            <BrandLogo
              iconClassName="h-14 w-14"
              nameClassName="text-2xl font-semibold"
              inverted
            />
          </motion.span>
        </Link>

        <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl p-7 md:p-9 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">{t("auth.otp.title")}</h1>
          <p className="text-muted-foreground mb-2">{t("auth.otp.subtitle")}</p>
          {email ? <p className="font-medium mb-6">{email}</p> : null}

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => {
                setCode(normalizeOtp(event.target.value));
                setError(null);
              }}
              placeholder="000000"
              className="h-14 text-center text-2xl font-semibold tracking-[0.35em]"
              aria-label={t("auth.otp.title")}
            />

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={isVerifying || code.length !== 6}
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : null}
              {isVerifying ? t("auth.otp.verifying") : t("auth.otp.verify")}
            </Button>
          </form>

          <div className="mt-5 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resent}
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : resent ? (
                <CheckCircle2 className="w-4 h-4 me-2 text-success" />
              ) : null}
              {resent ? t("auth.otp.codeSent") : t("auth.otp.resend")}
            </Button>

            <Link to="/auth" className="block">
              <Button variant="ghost" className="w-full">
                {t("auth.signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;

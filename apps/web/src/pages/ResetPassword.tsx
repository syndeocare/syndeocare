import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, InputWithIcon } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  FormFeedback,
  FormFeedbackContainer,
} from "@/components/ui/form-feedback";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  confirmPasswordReset,
  requestPasswordResetEmail,
} from "@/lib/auth-backend";
import { AUTH_CONFIG } from "@/config/constants";
import BrandLogo from "@/components/brand/BrandLogo";

interface ResetPasswordLocationState {
  email?: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const locationState = location.state as ResetPasswordLocationState | null;
  const isRecoveryLink = useMemo(() => {
    if (searchParams.has("token")) {
      return true;
    }
  }, [searchParams]);

  const [mode, setMode] = useState<"request" | "update">(
    isRecoveryLink ? "update" : "request",
  );
  const [email, setEmail] = useState(locationState?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(isRecoveryLink);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRecoveryLink) {
      setIsInitializing(false);
      return;
    }

    let isMounted = true;

    const prepareRecoverySession = async () => {
      try {
        const callbackError =
          searchParams.get("error_description") ?? searchParams.get("error");

        if (callbackError) {
          throw new Error(decodeURIComponent(callbackError));
        }

        if (!searchParams.get("token")) {
          throw new Error(t("auth.resetPassword.invalidLink"));
        }

        if (!isMounted) {
          return;
        }

        setMode("update");
      } catch (recoveryError) {
        if (!isMounted) {
          return;
        }

        setError(getErrorMessage(recoveryError));
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [isRecoveryLink, searchParams, t]);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSuccess(false);

    if (!email.trim()) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordResetEmail(
        email.trim(),
        AUTH_CONFIG.passwordResetRedirectUrl,
      );

      setIsSuccess(true);
      setMessage(t("auth.resetPassword.emailSentDesc"));
      toast({
        title: t("auth.resetPassword.emailSent"),
        description: t("auth.resetPassword.emailSentDesc"),
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      toast({
        variant: "destructive",
        title: t("auth.resetPassword.requestFailed"),
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < AUTH_CONFIG.minPasswordLength) {
      setError(t("auth.errors.passwordMin"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.resetPassword.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      const token = searchParams.get("token");

      if (!token) {
        throw new Error(t("auth.resetPassword.invalidLink"));
      }

      await confirmPasswordReset(token, password);

      setIsSuccess(true);
      setMessage(t("auth.resetPassword.successDesc"));
      toast({
        title: t("auth.resetPassword.success"),
        description: t("auth.resetPassword.successDesc"),
      });

      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 1200);
    } catch (updatePasswordError) {
      const message = getErrorMessage(updatePasswordError);
      setError(message);
      toast({
        variant: "destructive",
        title: t("auth.resetPassword.updateFailed"),
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-10 md:py-16 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 end-0 w-64 md:w-96 h-64 md:h-96 bg-accent/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-10 start-0 w-72 md:w-[30rem] h-72 md:h-[30rem] bg-primary/15 rounded-full blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-start mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 me-2" />
            {t("common.back")}
          </Button>
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

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl p-7 md:p-9"
        >
          {isInitializing ? (
            <div className="py-10 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t("auth.resetPassword.validatingLink")}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {mode === "update"
                    ? t("auth.resetPassword.title")
                    : t("auth.resetPassword.requestTitle")}
                </h1>
                <p className="text-muted-foreground">
                  {mode === "update"
                    ? t("auth.resetPassword.subtitle")
                    : t("auth.resetPassword.requestSubtitle")}
                </p>
              </div>

              <FormFeedbackContainer>
                {error && (
                  <FormFeedback
                    variant="error"
                    title={
                      mode === "update"
                        ? t("auth.resetPassword.updateFailed")
                        : t("auth.resetPassword.requestFailed")
                    }
                    message={error}
                    onDismiss={() => setError(null)}
                    className="mb-5"
                  />
                )}
                {message && (
                  <FormFeedback
                    variant="success"
                    title={
                      mode === "update"
                        ? t("auth.resetPassword.success")
                        : t("auth.resetPassword.emailSent")
                    }
                    message={message}
                    onDismiss={() => setMessage(null)}
                    className="mb-5"
                  />
                )}
              </FormFeedbackContainer>

              {mode === "update" ? (
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <FormField
                    label={t("auth.resetPassword.newPassword")}
                    htmlFor="new-password"
                    required
                  >
                    <PasswordInput
                      id="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t("auth.createPasswordPlaceholder")}
                      className="h-13 text-base"
                      showStrength
                    />
                  </FormField>

                  <FormField
                    label={t("auth.resetPassword.confirmPassword")}
                    htmlFor="confirm-password"
                    required
                  >
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder={t(
                        "auth.resetPassword.confirmPasswordPlaceholder",
                      )}
                      className="h-13 text-base"
                    />
                  </FormField>

                  <LoadingButton
                    type="submit"
                    variant="hero"
                    className="w-full h-13 text-base font-semibold"
                    isLoading={isLoading}
                    isSuccess={isSuccess}
                    loadingText={t("auth.resetPassword.updating")}
                    successText={t("auth.resetPassword.success")}
                  >
                    {t("auth.resetPassword.submit")}
                  </LoadingButton>
                </form>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-5">
                  <FormField
                    label={t("auth.email")}
                    htmlFor="reset-email"
                    required
                  >
                    <InputWithIcon icon={Mail}>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={t("auth.emailPlaceholder")}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-13 text-base"
                      />
                    </InputWithIcon>
                  </FormField>

                  <LoadingButton
                    type="submit"
                    variant="hero"
                    className="w-full h-13 text-base font-semibold"
                    isLoading={isLoading}
                    isSuccess={isSuccess}
                    loadingText={t("auth.resetPassword.sending")}
                    successText={t("auth.resetPassword.emailSent")}
                  >
                    {t("auth.resetPassword.sendLink")}
                  </LoadingButton>
                </form>
              )}

              <div className="mt-8 text-center text-muted-foreground">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  <Lock className="w-4 h-4" />
                  {t("auth.signIn")}
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;

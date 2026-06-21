import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Mail,
  User,
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { z } from "zod";
import { FormField, InputWithIcon } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { RoleSelector } from "@/components/ui/role-selector";
import {
  FormFeedback,
  FormFeedbackContainer,
} from "@/components/ui/form-feedback";
import BrandLogo from "@/components/brand/BrandLogo";

type UserRole = "professional" | "clinic";
type AuthMode = "login" | "signup";
type AuthStep = "role" | "method" | "details";

const parseUserRole = (role: string | null): UserRole | null => {
  if (role === "professional" || role === "clinic") {
    return role;
  }

  return null;
};

const getRouteAuthState = (pathname: string, search: string) => {
  const params = new URLSearchParams(search);
  const routeRole = parseUserRole(params.get("role"));
  const routeMode =
    params.get("mode") === "signup" || pathname === "/signup"
      ? ("signup" as const)
      : ("login" as const);

  return {
    mode: routeMode,
    role: routeRole,
    step:
      routeMode === "login"
        ? ("method" as const)
        : routeRole
          ? ("method" as const)
          : ("role" as const),
  };
};

const GoogleSignInButton = ({
  onClick,
  disabled,
  label,
}: {
  onClick: () => Promise<void>;
  disabled: boolean;
  label: string;
}) => (
  <Button
    type="button"
    variant="outline"
    className="w-full h-13 text-base font-medium"
    onClick={() => void onClick()}
    disabled={disabled}
  >
    <svg className="w-5 h-5 me-3" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
    {label}
  </Button>
);

const AuthMethodToggle = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="mx-auto flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline"
  >
    {children}
    <ChevronDown className="h-4 w-4" aria-hidden="true" />
  </button>
);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isStrongPassword = (password: string) =>
  password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);

const Auth = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const routeAuthState = getRouteAuthState(location.pathname, location.search);
  const {
    signIn,
    signUp,
    user,
    userRole,
    isOnboardingComplete,
    isLoading: authLoading,
    signInWithGoogle,
    completeGoogleOAuth,
  } = useAuth();
  const { toast } = useToast();

  const emailSchema = z.string().trim().email(t("auth.errors.invalidEmail"));
  const passwordSchema = z.string().min(8, t("auth.errors.passwordMin"));
  const signupPasswordSchema = passwordSchema.refine(
    isStrongPassword,
    t("auth.errors.passwordRequirements"),
  );

  const [mode, setMode] = useState<AuthMode>(routeAuthState.mode);
  const [step, setStep] = useState<AuthStep>(routeAuthState.step);
  const [role, setRole] = useState<UserRole | null>(routeAuthState.role);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const isGoogleAuthEnabled = true;
  const isOAuthCallback =
    typeof window !== "undefined" &&
    window.location.pathname === "/auth/oauth/callback";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });

  useEffect(() => {
    setMode(routeAuthState.mode);
    setRole(routeAuthState.role);
    setStep(routeAuthState.step);
    setErrors({});
    setFormError(null);
  }, [routeAuthState.mode, routeAuthState.role, routeAuthState.step]);

  // Redirect if already logged in
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;

    if (user) {
      // If user has a role, redirect appropriately
      if (userRole) {
        if (!isOnboardingComplete) {
          if (userRole === "professional") {
            navigate("/onboarding/professional");
          } else if (userRole === "clinic") {
            navigate("/onboarding/clinic");
          }
        } else {
          if (userRole === "professional") {
            navigate("/dashboard/professional");
          } else if (userRole === "clinic") {
            navigate("/dashboard/clinic");
          } else if (userRole === "admin" || userRole === "super_admin") {
            navigate("/admin");
          } else {
            navigate("/");
          }
        }
      } else {
        // User is logged in but has no role - they need to complete signup
        // This can happen if signup was interrupted or role assignment failed
        // Switch to signup mode so they can select a role
        if (mode === "login") {
          setMode("signup");
          setStep("role");
          toast({
            title: t("auth.completeSetup"),
            description: t("auth.selectRoleToContinue"),
          });
        }
      }
    }
  }, [
    user,
    userRole,
    isOnboardingComplete,
    authLoading,
    navigate,
    mode,
    toast,
    t,
  ]);

  useEffect(() => {
    if (!isOAuthCallback || authLoading) {
      return;
    }

    let isMounted = true;

    const finishGoogleAuth = async () => {
      setIsLoading(true);
      setFormError(null);

      const { error } = await completeGoogleOAuth();

      if (!isMounted) {
        return;
      }

      if (error) {
        const roleRequired = /role|required|choose/i.test(error.message);

        if (roleRequired) {
          toast({
            variant: "destructive",
            title: t("auth.errors.selectRole"),
            description: t("auth.googleRoleRequiredDesc"),
          });
          navigate("/signup", { replace: true });
          setMode("signup");
          setStep("role");
          setFormError(null);
          setIsLoading(false);
          return;
        }

        setFormError(error.message);
        toast({
          variant: "destructive",
          title: t("auth.errors.loginFailed"),
          description: error.message,
        });
        navigate("/auth", { replace: true });
      } else {
        toast({
          title: t("auth.success.welcomeBack"),
          description: t("auth.success.loggedIn"),
        });
        navigate("/auth", { replace: true });
      }

      setIsLoading(false);
    };

    void finishGoogleAuth();

    return () => {
      isMounted = false;
    };
  }, [authLoading, completeGoogleOAuth, isOAuthCallback, navigate, t, toast]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const normalizedEmail = normalizeEmail(formData.email);

    try {
      emailSchema.parse(normalizedEmail);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      (mode === "signup" ? signupPasswordSchema : passwordSchema).parse(
        formData.password,
      );
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (mode === "signup") {
      if (!formData.name.trim()) {
        newErrors.name = t("auth.errors.nameRequired");
      }
      if (role === "clinic" && !formData.organizationName.trim()) {
        newErrors.organizationName = t("auth.errors.orgNameRequired");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (
    field: keyof typeof formData,
    value: string,
    nextFormData = formData,
  ) => {
    let error: string | null = null;
    const nextValue = value.trim();

    if (field === "email") {
      const parsed = emailSchema.safeParse(normalizeEmail(value));
      error = parsed.success ? null : parsed.error.errors[0]?.message;
    }

    if (field === "password") {
      const parsed = (
        mode === "signup" ? signupPasswordSchema : passwordSchema
      ).safeParse(value);
      error = parsed.success ? null : parsed.error.errors[0]?.message;
    }

    if (mode === "signup" && field === "name") {
      error = nextValue ? null : t("auth.errors.nameRequired");
    }

    if (mode === "signup" && field === "organizationName") {
      error =
        role === "clinic" && !nextValue
          ? t("auth.errors.orgNameRequired")
          : null;
    }

    setErrors((current) => {
      const updated = { ...current };
      if (error) {
        updated[field] = error;
      } else {
        delete updated[field];
      }

      if (field === "name" && nextFormData.name.trim()) {
        delete updated.name;
      }

      return updated;
    });
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    const nextFormData = { ...formData, [field]: value };
    setFormData(nextFormData);
    setFormError(null);
    validateField(field, value, nextFormData);
  };

  const getLoginErrorMessage = (message: string) => {
    const normalizedError = message.toLowerCase();

    if (
      normalizedError.includes("invalid login credentials") ||
      normalizedError.includes("invalid email or password") ||
      normalizedError.includes("invalid username or password")
    ) {
      return t("auth.errors.invalidCredentials");
    }

    return message;
  };

  const getSignupErrorMessage = (message: string) => {
    const normalizedError = message.toLowerCase();

    if (
      normalizedError.includes("already registered") ||
      normalizedError.includes("already exists") ||
      normalizedError.includes("account exists") ||
      normalizedError.includes("email address")
    ) {
      return t("auth.errors.emailExists");
    }

    if (
      normalizedError.includes("invalid login credentials") ||
      normalizedError.includes("invalid email or password") ||
      normalizedError.includes("invalid username or password") ||
      normalizedError.includes("valid email, password, role") ||
      normalizedError.includes("validation")
    ) {
      return t("auth.errors.signupCheckDetails");
    }

    return message || t("auth.errors.signupCheckDetails");
  };

  const handleRoleSelect = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    void user;
    void userRole;
    setStep("method");
  };

  const switchToLogin = () => {
    setMode("login");
    setStep("method");
    setRole(null);
    setErrors({});
    setFormError(null);
  };

  const switchToSignup = () => {
    setMode("signup");
    setStep("role");
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(
          normalizeEmail(formData.email),
          formData.password,
        );

        if (error) {
          setFormError(getLoginErrorMessage(error.message));
        } else {
          setIsSuccess(true);
          toast({
            title: t("auth.success.welcomeBack"),
            description: t("auth.success.loggedIn"),
          });
        }
      } else {
        if (!role) {
          toast({
            variant: "destructive",
            title: t("auth.errors.selectRole"),
            description: t("auth.howToGetStarted"),
          });
          setIsLoading(false);
          return;
        }

        const normalizedEmail = normalizeEmail(formData.email);
        const { error, needsOnboarding, needsEmailConfirmation } = await signUp(
          normalizedEmail,
          formData.password,
          role,
          {
            name: formData.name.trim(),
            organizationName: formData.organizationName.trim(),
          },
        );

        if (error) {
          setFormError(getSignupErrorMessage(error.message));
        } else if (needsEmailConfirmation) {
          toast({
            title: t("auth.verification.checkEmail"),
            description: t("auth.otp.checkEmail"),
          });
          navigate("/verify-otp", { state: { email: normalizedEmail } });
        } else {
          toast({
            title: t("auth.success.accountCreated"),
            description: t("auth.success.completeProfile"),
          });

          if (needsOnboarding) {
            if (role === "professional") {
              navigate("/onboarding/professional");
            } else {
              navigate("/onboarding/clinic");
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);

    if (mode === "signup" && !role) {
      setStep("role");
      toast({
        variant: "destructive",
        title: t("auth.errors.selectRole"),
        description: t("auth.howToGetStarted"),
      });
      return;
    }

    setIsLoading(true);

    try {
      await signInWithGoogle(
        mode === "signup" ? (role ?? undefined) : undefined,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");
      setFormError(message);
      toast({
        variant: "destructive",
        title:
          mode === "signup"
            ? t("auth.errors.signupFailed")
            : t("auth.errors.loginFailed"),
        description: message,
      });
      setIsLoading(false);
    }
  };

  if (authLoading || isOAuthCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-10 md:py-16 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Language Switcher */}
        <div className="flex justify-end mb-6">
          <LanguageSwitcher variant="text" />
        </div>

        {/* Logo - use white logo for dark gradient background */}
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

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl p-7 md:p-9"
        >
          {mode === "login" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {t("auth.welcomeBack")}
                </h1>
                <p className="text-muted-foreground">
                  {t("auth.signInToContinue")}
                </p>
              </div>

              <FormFeedbackContainer>
                {formError && (
                  <FormFeedback
                    variant="error"
                    title={t("auth.errors.loginFailed")}
                    message={formError}
                    onDismiss={() => setFormError(null)}
                    className="mb-5"
                  />
                )}
              </FormFeedbackContainer>

              <div className="space-y-5">
                {isGoogleAuthEnabled && (
                  <GoogleSignInButton
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    label={t("auth.continueWithGoogle")}
                  />
                )}

                {step !== "details" ? (
                  <AuthMethodToggle onClick={() => setStep("details")}>
                    {t("auth.signInWithEmail")}
                  </AuthMethodToggle>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-5 border-t border-border pt-5"
                  >
                    <FormField
                      label={t("auth.email")}
                      htmlFor="email"
                      error={errors.email}
                      required
                    >
                      <InputWithIcon icon={Mail}>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("auth.emailPlaceholder")}
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          className="h-13 text-base"
                          autoComplete="email"
                        />
                      </InputWithIcon>
                    </FormField>

                    <FormField
                      label={t("auth.password")}
                      htmlFor="password"
                      error={errors.password}
                      required
                    >
                      <PasswordInput
                        id="password"
                        placeholder={t("auth.passwordPlaceholder")}
                        value={formData.password}
                        onChange={(e) =>
                          updateField("password", e.target.value)
                        }
                        className="h-13 text-base"
                      />
                    </FormField>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/reset-password", {
                            state: { email: formData.email },
                          })
                        }
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    </div>

                    <LoadingButton
                      type="submit"
                      variant="hero"
                      className="w-full h-13 text-base font-semibold"
                      isLoading={isLoading}
                      isSuccess={isSuccess}
                      loadingText={t("auth.signingIn")}
                      successText={t("auth.success.loggedIn")}
                    >
                      {t("auth.signIn")}
                    </LoadingButton>
                  </motion.form>
                )}
              </div>

              <div className="mt-8 text-center text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <button
                  onClick={switchToSignup}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("common.signUp")}
                </button>
              </div>
            </>
          ) : step === "role" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {user && !userRole
                    ? t("auth.completeSetup")
                    : t("auth.joinSyndeoCare")}
                </h1>
                <p className="text-muted-foreground">
                  {t("auth.howToGetStarted")}
                </p>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">{t("common.loading")}</p>
                </div>
              ) : (
                <RoleSelector
                  options={[
                    {
                      id: "professional",
                      icon: Users,
                      title: t("auth.imProfessional"),
                      description: t("auth.professionalDesc"),
                      gradient: "gradient-primary",
                    },
                    {
                      id: "clinic",
                      icon: Building2,
                      title: t("auth.imClinic"),
                      description: t("auth.clinicDesc"),
                      gradient: "gradient-accent",
                    },
                  ]}
                  selectedId={role}
                  onSelect={(id) => handleRoleSelect(id as UserRole)}
                />
              )}

              {/* Only show login link if user is not already logged in */}
              {!user && (
                <div className="mt-8 text-center text-muted-foreground">
                  {t("auth.haveAccount")}{" "}
                  <button
                    onClick={switchToLogin}
                    className="text-primary font-semibold hover:underline min-h-[44px] inline-flex items-center"
                  >
                    {t("auth.signIn")}
                  </button>
                </div>
              )}
            </>
          ) : step === "method" ? (
            <>
              <div className="text-center mb-8">
                <button
                  onClick={() => setStep("role")}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="w-4 h-4 rtl-flip" />
                  {t("common.back")}
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {role === "clinic"
                    ? t("auth.clinicSignUp")
                    : t("auth.professionalSignUp")}
                </h1>
                <p className="text-muted-foreground">
                  {t("auth.googleFirstHint")}
                </p>
              </div>

              <FormFeedbackContainer>
                {formError && (
                  <FormFeedback
                    variant="error"
                    title={t("auth.errors.signupFailed")}
                    message={formError}
                    onDismiss={() => setFormError(null)}
                    className="mb-5"
                  />
                )}
              </FormFeedbackContainer>

              <div className="space-y-5">
                {isGoogleAuthEnabled && (
                  <GoogleSignInButton
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    label={t("auth.continueWithGoogle")}
                  />
                )}

                <AuthMethodToggle onClick={() => setStep("details")}>
                  {t("auth.signUpWithEmail")}
                </AuthMethodToggle>
              </div>

              <div className="mt-8 text-center text-muted-foreground">
                {t("auth.haveAccount")}{" "}
                <button
                  onClick={switchToLogin}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <button
                  onClick={() => setStep("role")}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="w-4 h-4 rtl-flip" />
                  {t("common.back")}
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {role === "professional"
                    ? t("auth.professionalSignUp")
                    : t("auth.clinicSignUp")}
                </h1>
                <p className="text-muted-foreground">
                  {t("auth.createAccountToStart")}
                </p>
              </div>

              {/* Inline error feedback */}
              <FormFeedbackContainer>
                {formError && (
                  <FormFeedback
                    variant="error"
                    title={t("auth.errors.signupFailed")}
                    message={formError}
                    onDismiss={() => setFormError(null)}
                    className="mb-5"
                  />
                )}
              </FormFeedbackContainer>

              <form onSubmit={handleSubmit} className="space-y-5">
                {role === "clinic" && (
                  <FormField
                    label={t("auth.organizationName")}
                    htmlFor="organizationName"
                    error={errors.organizationName}
                    required
                  >
                    <InputWithIcon icon={Building2}>
                      <Input
                        id="organizationName"
                        type="text"
                        placeholder={t("auth.clinicNamePlaceholder")}
                        value={formData.organizationName}
                        onChange={(e) =>
                          updateField("organizationName", e.target.value)
                        }
                        className="h-13 text-base"
                      />
                    </InputWithIcon>
                  </FormField>
                )}

                <FormField
                  label={
                    role === "professional"
                      ? t("auth.fullName")
                      : t("auth.contactName")
                  }
                  htmlFor="name"
                  error={errors.name}
                  required
                >
                  <InputWithIcon icon={User}>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("auth.namePlaceholder")}
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="h-13 text-base"
                    />
                  </InputWithIcon>
                </FormField>

                <FormField
                  label={t("auth.email")}
                  htmlFor="email"
                  error={errors.email}
                  required
                >
                  <InputWithIcon icon={Mail}>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="h-13 text-base"
                    />
                  </InputWithIcon>
                </FormField>

                <FormField
                  label={t("auth.password")}
                  htmlFor="password"
                  error={errors.password}
                  required
                >
                  <PasswordInput
                    id="password"
                    placeholder={t("auth.createPasswordPlaceholder")}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="h-13 text-base"
                    showStrength
                  />
                </FormField>

                <LoadingButton
                  type="submit"
                  variant="hero"
                  className="w-full h-13 text-base font-semibold"
                  isLoading={isLoading}
                  loadingText={t("auth.creatingAccount")}
                >
                  {t("auth.createAccount")}
                  <ArrowRight className="w-5 h-5 ms-2 rtl-flip" />
                </LoadingButton>
              </form>

              <div className="mt-8 text-center text-muted-foreground">
                {t("auth.haveAccount")}{" "}
                <button
                  onClick={switchToLogin}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </div>

              <p className="mt-6 text-xs text-center text-muted-foreground leading-relaxed">
                {t("auth.termsAgreement")}
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import {
  BrandLockup,
  Button,
  Card,
  ErrorBanner,
  Field,
  Screen,
  SuccessBanner,
  colors,
  fonts,
  useTextStyles,
  useThemePalette,
} from "../src/components/ui";
import { requestPasswordReset } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { displayLabel } from "../src/lib/format";
import { hapticSelection } from "../src/lib/haptics";
import { usePreferences, useT } from "../src/lib/preferences";
import type { UserRole } from "../src/types";

type AuthMode = "signin" | "signup";
type AuthStep = "role" | "method" | "details";

type FormValues = {
  displayName: string;
  email: string;
  password: string;
};

function useAuthCopy() {
  const themed = useTextStyles();

  return {
    body: {
      color: themed.body.color,
      fontFamily: themed.body.fontFamily,
      textAlign: themed.body.textAlign,
      writingDirection: themed.body.writingDirection,
    },
    strong: {
      color: themed.strong.color,
      fontFamily: themed.strong.fontFamily,
      textAlign: themed.strong.textAlign,
      writingDirection: themed.strong.writingDirection,
    },
    title: {
      color: themed.h2.color,
      fontFamily: themed.h2.fontFamily,
      textAlign: "center" as const,
      writingDirection: themed.h2.writingDirection,
    },
  };
}

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<AuthStep>("method");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("professional");
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const t = useT();
  const { language } = usePreferences();

  const resolver = useMemo(() => {
    const signInSchema = z.object({
      displayName: z.string().optional(),
      email: z.string().email(t("validation.email")),
      password: z.string().min(8, t("validation.passwordLength")),
    });

    const signUpSchema = signInSchema.extend({
      displayName: z.string().min(2, t("validation.name")),
      password: z
        .string()
        .min(8, t("validation.passwordLength"))
        .regex(/[A-Z]/, t("validation.passwordUpper"))
        .regex(/\d/, t("validation.passwordNumber")),
    });

    return zodResolver(mode === "signup" ? signUpSchema : signInSchema);
  }, [mode, t]);

  const form = useForm<FormValues>({
    defaultValues: { displayName: "", email: "", password: "" },
    mode: "onChange",
    resolver,
  });

  const authMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === "signin") {
        await signIn(values.email.trim().toLowerCase(), values.password);
        return;
      }

      await signUp({
        displayName: values.displayName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role,
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const email = form.getValues("email").trim().toLowerCase();
      if (!z.string().email().safeParse(email).success) {
        throw new Error(t("auth.emailFirstForReset"));
      }
      await requestPasswordReset(email);
    },
  });

  const googleMutation = useMutation({
    mutationFn: async () => {
      await signInWithGoogle(mode === "signup" ? role : undefined);
    },
  });

  const password = form.watch("password");
  const checks = useMemo(
    () => [
      { label: t("validation.ruleLength"), ok: password.length >= 8 },
      { label: t("validation.ruleUpper"), ok: /[A-Z]/.test(password) },
      { label: t("validation.ruleNumber"), ok: /\d/.test(password) },
    ],
    [password, t],
  );

  const googleErrorMessage =
    googleMutation.error instanceof Error ? googleMutation.error.message : "";
  const googleCancelled = googleErrorMessage
    .toLowerCase()
    .includes("cancelled");
  const errorMessage =
    authMutation.error instanceof Error
      ? displayLabel(authMutation.error.message, language)
      : googleMutation.error instanceof Error && !googleCancelled
        ? displayLabel(googleMutation.error.message, language)
        : resetMutation.error instanceof Error
          ? displayLabel(resetMutation.error.message, language)
          : undefined;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep(nextMode === "signin" ? "method" : "role");
    authMutation.reset();
    googleMutation.reset();
    resetMutation.reset();
    form.clearErrors();
  };

  const handleGooglePress = () => {
    googleMutation.mutate();
  };

  return (
    <Screen tone="auth">
      <View style={styles.hero}>
        <BrandLockup centered />
      </View>

      <Card>
        {mode === "signin" ? (
          <SignInContent
            checks={checks}
            errorMessage={errorMessage}
            form={form}
            googlePending={googleMutation.isPending}
            onGooglePress={handleGooglePress}
            onReset={() => resetMutation.mutate()}
            onSubmit={form.handleSubmit((values) =>
              authMutation.mutate(values),
            )}
            onSwitchToSignup={() => switchMode("signup")}
            resetPending={resetMutation.isPending}
            resetSuccess={resetMutation.isSuccess}
            setStep={setStep}
            step={step}
            submitPending={authMutation.isPending}
          />
        ) : step === "role" ? (
          <RoleContent
            onSelect={(selectedRole) => {
              setRole(selectedRole);
              setStep("method");
            }}
            onSwitchToSignin={() => switchMode("signin")}
            role={role}
          />
        ) : step === "method" ? (
          <MethodContent
            errorMessage={errorMessage}
            googlePending={googleMutation.isPending}
            onBack={() => setStep("role")}
            onEmail={() => setStep("details")}
            onGooglePress={handleGooglePress}
            onSwitchToSignin={() => switchMode("signin")}
            role={role}
          />
        ) : (
          <DetailsContent
            checks={checks}
            errorMessage={errorMessage}
            form={form}
            onBack={() => setStep("role")}
            onSubmit={form.handleSubmit((values) =>
              authMutation.mutate(values),
            )}
            onSwitchToSignin={() => switchMode("signin")}
            role={role}
            submitPending={authMutation.isPending}
          />
        )}
      </Card>
    </Screen>
  );
}

function GoogleButton({
  loading,
  onPress,
}: {
  loading?: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const { direction, language } = usePreferences();
  const palette = useThemePalette();
  const isRTL = direction === "rtl";
  return (
    <Pressable
      disabled={loading}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.googleButton,
        { backgroundColor: palette.input, borderColor: palette.border },
        isRTL && styles.rowReverse,
        pressed && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={styles.googleSpinner}
        />
      ) : (
        <View style={styles.googleIcon}>
          <Text style={styles.googleIconText}>G</Text>
        </View>
      )}
      <Text
        style={[
          styles.googleButtonText,
          { color: palette.text },
          language === "ar" && styles.googleButtonTextArabic,
        ]}
      >
        {loading ? t("auth.googleOpening") : t("auth.continueWithGoogle")}
      </Text>
    </Pressable>
  );
}

function GoogleSecureHint() {
  const { direction, language } = usePreferences();
  const copy = useAuthCopy();
  const t = useT();
  const isRTL = direction === "rtl";

  return (
    <View style={[styles.googleHint, isRTL && styles.rowReverse]}>
      <ShieldCheck color={colors.accent} size={16} />
      <Text
        style={[
          copy.body,
          styles.googleHintText,
          language === "ar" && styles.googleHintTextArabic,
        ]}
      >
        {t("auth.googleSecureHint")}
      </Text>
    </View>
  );
}

function EmailToggle({
  children,
  onPress,
}: {
  children: string;
  onPress: () => void;
}) {
  const palette = useThemePalette();
  const { language } = usePreferences();
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={styles.emailToggle}
    >
      <Text
        style={[
          styles.emailToggleText,
          {
            color: palette.text,
            fontFamily: language === "ar" ? fonts.arabicBold : fonts.bodyBold,
          },
        ]}
      >
        {children}
      </Text>
      <ChevronDown color={colors.primary} size={16} />
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const { direction } = usePreferences();
  const palette = useThemePalette();
  const t = useT();
  const copy = useAuthCopy();
  const Icon = direction === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={styles.backButton}
    >
      <Icon color={palette.muted} size={17} />
      <Text style={[styles.backText, copy.body]}>{t("auth.back")}</Text>
    </Pressable>
  );
}

function SignInContent({
  errorMessage,
  form,
  googlePending,
  onGooglePress,
  onReset,
  onSubmit,
  onSwitchToSignup,
  resetPending,
  resetSuccess,
  setStep,
  step,
  submitPending,
}: {
  checks: { label: string; ok: boolean }[];
  errorMessage?: string;
  form: ReturnType<typeof useForm<FormValues>>;
  googlePending: boolean;
  onGooglePress: () => void;
  onReset: () => void;
  onSubmit: () => void;
  onSwitchToSignup: () => void;
  resetPending: boolean;
  resetSuccess: boolean;
  setStep: (step: AuthStep) => void;
  step: AuthStep;
  submitPending: boolean;
}) {
  const t = useT();
  const copy = useAuthCopy();
  const palette = useThemePalette();
  const { language } = usePreferences();
  const family = language === "ar" ? fonts.arabicBold : fonts.bodyBold;
  return (
    <>
      <View style={styles.centerHeader}>
        <Text style={[styles.title, copy.title]}>{t("auth.welcomeBack")}</Text>
        <Text style={[styles.subtitle, copy.body]}>
          {t("auth.signInSubtitle")}
        </Text>
      </View>

      <ErrorBanner message={errorMessage} />

      <View style={styles.stack}>
        <GoogleButton loading={googlePending} onPress={onGooglePress} />
        <GoogleSecureHint />

        {step !== "details" ? (
          <EmailToggle onPress={() => setStep("details")}>
            {t("auth.signInWithEmail")}
          </EmailToggle>
        ) : (
          <View
            style={[styles.detailsPanel, { borderTopColor: palette.border }]}
          >
            <EmailPasswordFields form={form} />
            <SuccessBanner
              message={
                resetSuccess ? t("auth.passwordResetRequested") : undefined
              }
            />
            <Pressable
              disabled={resetPending}
              onPress={() => {
                hapticSelection();
                onReset();
              }}
            >
              <Text style={[styles.forgotText, { fontFamily: family }]}>
                {resetPending
                  ? t("auth.sendingReset")
                  : t("auth.forgotPassword")}
              </Text>
            </Pressable>
            <Button
              disabled={!form.formState.isValid}
              loading={submitPending}
              onPress={onSubmit}
            >
              {t("auth.signIn")}
            </Button>
          </View>
        )}
      </View>

      <View style={styles.footerLine}>
        <Text style={[styles.footerMuted, copy.body]}>
          {t("auth.noAccount")}{" "}
        </Text>
        <Pressable
          onPress={() => {
            hapticSelection();
            onSwitchToSignup();
          }}
        >
          <Text style={styles.footerLink}>{t("auth.signUp")}</Text>
        </Pressable>
      </View>
    </>
  );
}

function RoleContent({
  onSelect,
  onSwitchToSignin,
  role,
}: {
  onSelect: (role: Exclude<UserRole, "admin">) => void;
  onSwitchToSignin: () => void;
  role: Exclude<UserRole, "admin">;
}) {
  const t = useT();
  const copy = useAuthCopy();
  return (
    <>
      <View style={styles.centerHeader}>
        <Text style={[styles.title, copy.title]}>{t("auth.join")}</Text>
        <Text style={[styles.subtitle, copy.body]}>
          {t("auth.startChoice")}
        </Text>
      </View>

      <View style={styles.roleCards}>
        <RoleCard
          description={t("auth.professionalDescription")}
          icon={<Users color="#ffffff" size={24} />}
          isSelected={role === "professional"}
          onPress={() => onSelect("professional")}
          title={t("auth.roleProfessional")}
          variant="primary"
        />
        <RoleCard
          description={t("auth.clinicDescription")}
          icon={<Building2 color="#ffffff" size={24} />}
          isSelected={role === "clinic"}
          onPress={() => onSelect("clinic")}
          title={t("auth.roleClinic")}
          variant="accent"
        />
      </View>

      <View style={styles.footerLine}>
        <Text style={[styles.footerMuted, copy.body]}>
          {t("auth.alreadyAccount")}{" "}
        </Text>
        <Pressable
          onPress={() => {
            hapticSelection();
            onSwitchToSignin();
          }}
        >
          <Text style={styles.footerLink}>{t("auth.signIn")}</Text>
        </Pressable>
      </View>
    </>
  );
}

function RoleCard({
  description,
  icon,
  isSelected,
  onPress,
  title,
  variant,
}: {
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
  title: string;
  variant: "accent" | "primary";
}) {
  const { direction } = usePreferences();
  const palette = useThemePalette();
  const copy = useAuthCopy();
  const Icon = direction === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={[
        styles.roleCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        direction === "rtl" && styles.rowReverse,
        isSelected && {
          backgroundColor: palette.surfaceMuted,
          borderColor: colors.primary,
        },
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          variant === "accent" ? styles.roleIconAccent : styles.roleIconPrimary,
        ]}
      >
        {icon}
      </View>
      <View style={styles.roleCopy}>
        <Text style={[styles.roleTitle, copy.strong]}>{title}</Text>
        <Text style={[styles.roleDescription, copy.body]}>{description}</Text>
      </View>
      <Icon color={colors.primary} size={18} />
    </Pressable>
  );
}

function MethodContent({
  errorMessage,
  googlePending,
  onBack,
  onEmail,
  onGooglePress,
  onSwitchToSignin,
  role,
}: {
  errorMessage?: string;
  googlePending: boolean;
  onBack: () => void;
  onEmail: () => void;
  onGooglePress: () => void;
  onSwitchToSignin: () => void;
  role: Exclude<UserRole, "admin">;
}) {
  const t = useT();
  const copy = useAuthCopy();
  return (
    <>
      <View style={styles.centerHeader}>
        <BackButton onPress={onBack} />
        <Text style={[styles.title, copy.title]}>
          {role === "clinic"
            ? t("auth.clinicSignup")
            : t("auth.professionalSignup")}
        </Text>
        <Text style={[styles.subtitle, copy.body]}>
          {t("auth.googleFirstHint")}
        </Text>
      </View>

      <ErrorBanner message={errorMessage} />

      <View style={styles.stack}>
        <GoogleButton loading={googlePending} onPress={onGooglePress} />
        <GoogleSecureHint />
        <EmailToggle onPress={onEmail}>{t("auth.signUpWithEmail")}</EmailToggle>
      </View>

      <View style={styles.footerLine}>
        <Text style={[styles.footerMuted, copy.body]}>
          {t("auth.alreadyAccount")}{" "}
        </Text>
        <Pressable
          onPress={() => {
            hapticSelection();
            onSwitchToSignin();
          }}
        >
          <Text style={styles.footerLink}>{t("auth.signIn")}</Text>
        </Pressable>
      </View>
    </>
  );
}

function DetailsContent({
  checks,
  errorMessage,
  form,
  onBack,
  onSubmit,
  onSwitchToSignin,
  role,
  submitPending,
}: {
  checks: { label: string; ok: boolean }[];
  errorMessage?: string;
  form: ReturnType<typeof useForm<FormValues>>;
  onBack: () => void;
  onSubmit: () => void;
  onSwitchToSignin: () => void;
  role: Exclude<UserRole, "admin">;
  submitPending: boolean;
}) {
  const t = useT();
  const copy = useAuthCopy();
  const palette = useThemePalette();
  const { language } = usePreferences();
  const family = language === "ar" ? fonts.arabicBold : fonts.bodyBold;
  return (
    <>
      <View style={styles.centerHeader}>
        <BackButton onPress={onBack} />
        <Text style={[styles.title, copy.title]}>
          {role === "clinic"
            ? t("auth.clinicSignup")
            : t("auth.professionalSignup")}
        </Text>
        <Text style={[styles.subtitle, copy.body]}>
          {t("auth.createAccountToStart")}
        </Text>
      </View>

      <ErrorBanner message={errorMessage} />

      <View style={styles.stack}>
        <Controller
          control={form.control}
          name="displayName"
          render={({ field, fieldState }) => (
            <Field
              autoCapitalize="words"
              autoComplete="name"
              error={fieldState.error?.message}
              label={
                role === "clinic"
                  ? t("auth.organizationName")
                  : t("auth.fullName")
              }
              leftIcon={
                role === "clinic" ? (
                  <Building2 color={palette.placeholder} size={20} />
                ) : (
                  <User color={palette.placeholder} size={20} />
                )
              }
              onChangeText={field.onChange}
              returnKeyType="next"
              textContentType={role === "clinic" ? "organizationName" : "name"}
              value={field.value}
            />
          )}
        />
        <EmailPasswordFields form={form} />

        <View
          style={[
            styles.checks,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border,
            },
          ]}
        >
          {checks.map((check) => (
            <Text
              key={check.label}
              style={[
                styles.check,
                { color: palette.muted, fontFamily: family },
                check.ok && styles.checkOk,
              ]}
            >
              {check.ok ? "✓" : "•"} {check.label}
            </Text>
          ))}
        </View>

        <Button
          disabled={!form.formState.isValid}
          loading={submitPending}
          onPress={onSubmit}
        >
          {t("auth.createAccount")}
        </Button>
      </View>

      <View style={styles.footerLine}>
        <Text style={[styles.footerMuted, copy.body]}>
          {t("auth.alreadyAccount")}{" "}
        </Text>
        <Pressable
          onPress={() => {
            hapticSelection();
            onSwitchToSignin();
          }}
        >
          <Text style={styles.footerLink}>{t("auth.signIn")}</Text>
        </Pressable>
      </View>

      <Text style={[styles.terms, copy.body]}>{t("auth.terms")}</Text>
    </>
  );
}

function EmailPasswordFields({
  form,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
}) {
  const t = useT();
  const palette = useThemePalette();
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <>
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field
            autoComplete="email"
            error={fieldState.error?.message}
            keyboardType="email-address"
            label={t("auth.email")}
            leftIcon={<Mail color={palette.placeholder} size={20} />}
            onChangeText={field.onChange}
            placeholder="name@example.com"
            returnKeyType="next"
            textContentType="username"
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field
            autoComplete="current-password"
            error={fieldState.error?.message}
            label={t("auth.password")}
            leftIcon={<Lock color={palette.placeholder} size={20} />}
            onChangeText={field.onChange}
            placeholder="••••••••"
            rightIcon={
              <Pressable
                accessibilityLabel={
                  passwordVisible
                    ? t("auth.hidePassword")
                    : t("auth.showPassword")
                }
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? (
                  <EyeOff color={palette.placeholder} size={20} />
                ) : (
                  <Eye color={palette.placeholder} size={20} />
                )}
              </Pressable>
            }
            returnKeyType="done"
            secureTextEntry={!passwordVisible}
            textContentType="password"
            value={field.value}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
  },
  backText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  centerHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  check: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  checkOk: {
    color: colors.success,
    fontFamily: fonts.bodyBold,
  },
  checks: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  detailsPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 14,
    paddingTop: 18,
  },
  emailToggle: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  emailToggleText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  footerLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 18,
  },
  footerLink: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  footerMuted: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  forgotText: {
    alignSelf: "flex-end",
    color: colors.primary,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  googleButtonText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  googleButtonTextArabic: {
    fontFamily: fonts.arabicMedium,
  },
  googleHint: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 7,
    maxWidth: 300,
  },
  googleHintText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  googleHintTextArabic: {
    fontFamily: fonts.arabic,
  },
  googleIcon: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  googleIconText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  googleSpinner: {
    marginEnd: 10,
  },
  hero: {
    alignItems: "center",
    paddingBottom: 8,
    paddingTop: 10,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  roleCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 98,
    padding: 14,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleCards: {
    gap: 12,
  },
  roleCopy: {
    flex: 1,
    gap: 3,
  },
  roleDescription: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  roleIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  roleIconAccent: {
    backgroundColor: colors.accent,
  },
  roleIconPrimary: {
    backgroundColor: colors.primary,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  roleTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  stack: {
    gap: 14,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  success: {
    color: colors.success,
    fontFamily: fonts.bodyBold,
  },
  terms: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
});

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  deleteGatewayAccount,
  getGatewayPreferences,
  updateGatewayPassword,
  updateGatewayPreferences,
} from "@/lib/auth-backend";
import { AUTH_CONFIG } from "@/config/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Settings as SettingsIcon,
  Palette,
  Bell,
  Globe,
  Shield,
  Trash2,
} from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserPreferences {
  language: string;
  theme: string;
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_in_app: boolean;
  email_new_jobs: boolean;
  email_new_messages: boolean;
  email_booking_updates: boolean;
  email_digest: string;
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const isRTL = i18n.language === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: language,
    theme: theme,
    notifications_email: true,
    notifications_push: true,
    notifications_in_app: true,
    email_new_jobs: true,
    email_new_messages: true,
    email_booking_updates: true,
    email_digest: "daily",
  });

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getGatewayPreferences();
      setPreferences({
        language: data.language || language,
        theme: data.theme || theme,
        notifications_email: data.notificationsEmail,
        notifications_push: data.notificationsPush,
        notifications_in_app: data.notificationsInApp,
        email_new_jobs: data.emailNewJobs,
        email_new_messages: data.emailNewMessages,
        email_booking_updates: data.emailBookingUpdates,
        email_digest: data.emailDigest,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [language, theme, user]);

  useEffect(() => {
    if (user) {
      void fetchPreferences();
    }
  }, [fetchPreferences, user]);

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateGatewayPreferences({
        language: preferences.language,
        theme: preferences.theme,
        notificationsEmail: preferences.notifications_email,
        notificationsPush: preferences.notifications_push,
        notificationsInApp: preferences.notifications_in_app,
        emailNewJobs: preferences.email_new_jobs,
        emailNewMessages: preferences.email_new_messages,
        emailBookingUpdates: preferences.email_booking_updates,
        emailDigest: preferences.email_digest,
      });

      // Apply theme and language changes
      setTheme(preferences.theme as "light" | "dark" | "system");
      setLanguage(preferences.language as "en" | "ar");

      toast({
        title: t("settings.saved"),
        description: t("settings.savedDesc"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t("common.error");

  const handleChangePassword = async () => {
    if (!user) return;

    if (passwordForm.currentPassword.length < AUTH_CONFIG.minPasswordLength) {
      toast({
        variant: "destructive",
        title: t("settings.passwordUpdateFailed"),
        description: t("settings.currentPasswordRequired"),
      });
      return;
    }

    if (passwordForm.newPassword.length < AUTH_CONFIG.minPasswordLength) {
      toast({
        variant: "destructive",
        title: t("settings.passwordUpdateFailed"),
        description: t("auth.errors.passwordMin"),
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: t("settings.passwordUpdateFailed"),
        description: t("settings.passwordMismatch"),
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateGatewayPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: t("settings.passwordUpdated"),
        description: t("settings.passwordUpdatedDesc"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("settings.passwordUpdateFailed"),
        description: getErrorMessage(error),
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      await deleteGatewayAccount();

      toast({
        title: t("settings.accountDeleted"),
        description: t("settings.accountDeletedDesc"),
      });

      await signOut();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getErrorMessage(error),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="container py-6 md:py-10 max-w-3xl"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8" />
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("settings.appearance")}
            </CardTitle>
            <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme" className="text-base">
                  {t("settings.theme")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.themeDesc")}
                </p>
              </div>
              <Select
                value={preferences.theme}
                onValueChange={(v) =>
                  setPreferences({ ...preferences, theme: v })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("common.light")}</SelectItem>
                  <SelectItem value="dark">{t("common.dark")}</SelectItem>
                  <SelectItem value="system">{t("common.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Language */}
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="language"
                  className="text-base flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  {t("settings.language")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.languageDesc")}
                </p>
              </div>
              <Select
                value={preferences.language}
                onValueChange={(v) =>
                  setPreferences({ ...preferences, language: v })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("settings.notifications")}
            </CardTitle>
            <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">
                  {t("settings.pushNotifications")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.pushNotificationsDesc")}
                </p>
              </div>
              <Switch
                checked={preferences.notifications_push}
                onCheckedChange={(v) =>
                  setPreferences({ ...preferences, notifications_push: v })
                }
              />
            </div>

            <Separator />

            {/* In-App Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">
                  {t("settings.inAppNotifications")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.inAppNotificationsDesc")}
                </p>
              </div>
              <Switch
                checked={preferences.notifications_in_app}
                onCheckedChange={(v) =>
                  setPreferences({ ...preferences, notifications_in_app: v })
                }
              />
            </div>

            <Separator />

            {/* Email Notifications Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base">
                    {t("settings.emailNotifications")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.emailNotificationsDesc")}
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications_email}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, notifications_email: v })
                  }
                />
              </div>

              {preferences.notifications_email && (
                <div className="ms-4 space-y-4 pt-2 border-s-2 ps-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.emailNewJobs")}</Label>
                    <Switch
                      checked={preferences.email_new_jobs}
                      onCheckedChange={(v) =>
                        setPreferences({ ...preferences, email_new_jobs: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.emailNewMessages")}</Label>
                    <Switch
                      checked={preferences.email_new_messages}
                      onCheckedChange={(v) =>
                        setPreferences({
                          ...preferences,
                          email_new_messages: v,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.emailBookingUpdates")}</Label>
                    <Switch
                      checked={preferences.email_booking_updates}
                      onCheckedChange={(v) =>
                        setPreferences({
                          ...preferences,
                          email_booking_updates: v,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.emailDigest")}</Label>
                    <Select
                      value={preferences.email_digest}
                      onValueChange={(v) =>
                        setPreferences({ ...preferences, email_digest: v })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">
                          {t("settings.daily")}
                        </SelectItem>
                        <SelectItem value="weekly">
                          {t("settings.weekly")}
                        </SelectItem>
                        <SelectItem value="never">
                          {t("settings.never")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("settings.account")}
            </CardTitle>
            <CardDescription>{t("settings.accountDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.email")}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <p className="font-medium">{t("settings.changePassword")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.changePasswordDesc")}
                </p>
              </div>

              <FormField
                label={t("settings.currentPassword")}
                htmlFor="settings-current-password"
                required
              >
                <Input
                  id="settings-current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder={t("settings.currentPassword")}
                  className="h-11"
                  autoComplete="current-password"
                />
              </FormField>

              <FormField
                label={t("settings.newPassword")}
                htmlFor="settings-new-password"
                required
              >
                <PasswordInput
                  id="settings-new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder={t("auth.createPasswordPlaceholder")}
                  className="h-11"
                  autoComplete="new-password"
                  showStrength
                />
              </FormField>

              <FormField
                label={t("settings.confirmNewPassword")}
                htmlFor="settings-confirm-password"
                required
              >
                <Input
                  id="settings-confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder={t("settings.confirmNewPassword")}
                  className="h-11"
                  autoComplete="new-password"
                />
              </FormField>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleChangePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("settings.updatingPassword")}
                  </>
                ) : (
                  t("settings.updatePassword")
                )}
              </Button>
            </div>

            <Separator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full min-h-[48px]">
                  <Trash2 className="h-4 w-4 me-2" />
                  {t("settings.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings.deleteAccountTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.deleteAccountDesc")}
                    <span className="block mt-2 text-destructive font-medium">
                      {t("settings.deleteAccountConfirm")}
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel className="min-h-[44px]">
                    {t("common.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground min-h-[44px]"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 me-2" />
                    )}
                    {t("settings.confirmDelete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            t("settings.saveChanges")
          )}
        </Button>
      </div>
    </div>
  );
}

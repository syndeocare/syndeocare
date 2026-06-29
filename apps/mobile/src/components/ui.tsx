import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Languages, Moon, Sun } from "lucide-react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { displayLabel } from "../lib/format";
import { usePreferences, useT } from "../lib/preferences";

const brandMark = require("../../assets/syndeocare-mark.png");

export const colors = {
  accent: "#56849A",
  accentDark: "#477082",
  bg: "#F8FAFB",
  border: "#DDE5E8",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  dark: "#150F1C",
  darkCard: "#20162A",
  darkMuted: "#B9A9C4",
  muted: "#5B6E78",
  panel: "#FFFFFF",
  panelSoft: "#F3F6F7",
  primary: "#663C6D",
  primaryDark: "#4F2E55",
  primarySoft: "#F1E8F3",
  success: "#059669",
  successSoft: "#DCFCE7",
  text: "#3B2943",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
};

export const fonts = {
  body: "Ubuntu_400Regular",
  bodyMedium: "Ubuntu_500Medium",
  bodyBold: "Ubuntu_700Bold",
  arabic: "Cairo_400Regular",
  arabicMedium: "Cairo_500Medium",
  arabicBold: "Cairo_700Bold",
};

export function useThemePalette() {
  const { theme } = usePreferences();
  const isDark = theme === "dark";

  return {
    background: isDark ? colors.dark : colors.bg,
    border: isDark ? "rgba(255,255,255,0.12)" : colors.border,
    control: isDark ? "rgba(255,255,255,0.10)" : "rgba(102,60,109,0.08)",
    controlBorder: isDark ? "rgba(255,255,255,0.16)" : "rgba(102,60,109,0.13)",
    input: isDark ? "#1A1022" : "#ffffff",
    muted: isDark ? "#E2D8EA" : colors.muted,
    placeholder: isDark ? "#BAABCA" : "#8798A1",
    shadow: isDark ? "#000000" : "#5B6E78",
    surface: isDark ? "#24172F" : colors.panel,
    surfaceMuted: isDark ? "#30203B" : colors.panelSoft,
    text: isDark ? "#F8FAFB" : colors.text,
  };
}

export function useTextStyles() {
  const { direction, language } = usePreferences();
  const palette = useThemePalette();
  const isArabic = language === "ar";
  const bodyFamily = isArabic ? fonts.arabic : fonts.body;
  const boldFamily = isArabic ? fonts.arabicBold : fonts.bodyBold;
  const textAlign = direction === "rtl" ? "right" : "left";

  return {
    body: {
      color: palette.muted,
      fontFamily: bodyFamily,
      fontSize: 15,
      lineHeight: 22,
      textAlign,
      writingDirection: direction,
    } as const,
    h1: {
      color: palette.text,
      fontFamily: boldFamily,
      fontSize: 32,
      lineHeight: 38,
      textAlign,
      writingDirection: direction,
    } as const,
    h2: {
      color: palette.text,
      fontFamily: boldFamily,
      fontSize: 22,
      lineHeight: 28,
      textAlign,
      writingDirection: direction,
    } as const,
    overline: {
      color: colors.accentDark,
      fontFamily: boldFamily,
      fontSize: 12,
      letterSpacing: 0.6,
      textAlign,
      textTransform: "uppercase",
      writingDirection: direction,
    } as const,
    strong: {
      color: palette.text,
      fontFamily: boldFamily,
      fontSize: 16,
      textAlign,
      writingDirection: direction,
    } as const,
  };
}

const gradients = {
  appDark: ["#150F1C", "#24162E", "#150F1C"] as const,
  appLight: ["#FAFCFD", "#F2F7F8", "#F8FAFB"] as const,
  brand: [colors.primary, colors.accent] as const,
  hero: ["#150F1C", "#2A1B35", "#150F1C"] as const,
};

type ScreenTone = "app" | "auth";
type KeyboardAwareScrollContextValue = {
  ensureInputVisible: (target?: null | number) => void;
};

const KeyboardAwareScrollContext =
  createContext<KeyboardAwareScrollContextValue>({
    ensureInputVisible: () => undefined,
  });

export function useKeyboardAwareInput() {
  return useContext(KeyboardAwareScrollContext);
}

function pressFeedback() {
  if (Platform.OS === "web") return;
  void Haptics.selectionAsync().catch(() => undefined);
}

export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <View
      style={[
        styles.brandMark,
        { borderRadius: size / 2, height: size, width: size },
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        source={brandMark}
        style={{ height: size, width: size }}
      />
    </View>
  );
}

export function BrandLockup({
  centered,
  compact,
  onDark = true,
}: {
  centered?: boolean;
  compact?: boolean;
  onDark?: boolean;
}) {
  const { direction, language } = usePreferences();
  const palette = useThemePalette();
  const t = useT();
  const isRTL = direction === "rtl";
  const family = language === "ar" ? fonts.arabicBold : fonts.bodyBold;
  const bodyFamily = language === "ar" ? fonts.arabic : fonts.body;

  return (
    <View
      style={[
        styles.brandLockup,
        isRTL && !centered && styles.rowReverse,
        centered && styles.brandLockupCentered,
        compact && styles.brandLockupCompact,
      ]}
    >
      <BrandMark size={compact ? 38 : 54} />
      <View style={centered ? styles.brandCopyCentered : undefined}>
        <Text
          style={[
            styles.brandName,
            {
              color: onDark ? "#ffffff" : palette.text,
              fontFamily: family,
              writingDirection: direction,
            },
            compact && styles.brandNameCompact,
          ]}
        >
          SyndeoCare
        </Text>
        {!compact ? (
          <Text
            style={[
              styles.brandTagline,
              {
                color: onDark ? colors.darkMuted : palette.muted,
                fontFamily: bodyFamily,
                writingDirection: direction,
              },
            ]}
          >
            {t("app.tagline")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function PreferenceControls({
  compact,
  onDark,
}: {
  compact?: boolean;
  onDark?: boolean;
}) {
  const {
    direction,
    language,
    languagePreference,
    setLanguagePreference,
    setThemePreference,
    theme,
    themePreference,
    t,
  } = usePreferences();
  const palette = useThemePalette();
  const isRTL = direction === "rtl";
  const isOnDark = onDark ?? theme === "dark";
  const controlColor = isOnDark ? "#ffffff" : colors.primary;
  const languageOptions = [
    { label: t("controls.deviceLanguage"), value: "device" as const },
    { label: t("controls.english"), value: "en" as const },
    { label: "العربية", value: "ar" as const },
  ];
  const themeOptions = [
    {
      icon: <Sun color={controlColor} size={16} />,
      label: t("controls.system"),
      value: "system" as const,
    },
    {
      icon: <Sun color={controlColor} size={16} />,
      label: t("controls.light"),
      value: "light" as const,
    },
    {
      icon: <Moon color={controlColor} size={16} />,
      label: t("controls.dark"),
      value: "dark" as const,
    },
  ];

  const buttonStyle = (selected: boolean, pressed: boolean) => [
    styles.preferenceButton,
    {
      backgroundColor: selected
        ? isOnDark
          ? "rgba(255,255,255,0.18)"
          : colors.primarySoft
        : isOnDark
          ? "rgba(255,255,255,0.10)"
          : palette.control,
      borderColor: selected
        ? colors.primary
        : isOnDark
          ? "rgba(255,255,255,0.16)"
          : palette.controlBorder,
    },
    compact && styles.preferenceButtonCompact,
    pressed && styles.buttonPressed,
  ];

  return (
    <View style={styles.preferenceStack}>
      <View style={[styles.preferenceGroupHeader, isRTL && styles.rowReverse]}>
        <Languages color={controlColor} size={16} />
        <Text
          style={[
            styles.preferenceGroupTitle,
            { color: controlColor },
            language === "ar" && styles.preferenceTextArabic,
          ]}
        >
          {t("controls.language")}
        </Text>
      </View>
      <View style={[styles.preferenceControls, isRTL && styles.rowReverse]}>
        {languageOptions.map((option) => (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{
              checked: languagePreference === option.value,
            }}
            hitSlop={6}
            key={option.value}
            onPress={() => {
              pressFeedback();
              setLanguagePreference(option.value);
            }}
            style={({ pressed }) =>
              buttonStyle(languagePreference === option.value, pressed)
            }
          >
            <Text
              style={[
                styles.preferenceText,
                { color: controlColor },
                language === "ar" && styles.preferenceTextArabic,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.preferenceGroupHeader, isRTL && styles.rowReverse]}>
        {theme === "dark" ? (
          <Moon color={controlColor} size={16} />
        ) : (
          <Sun color={controlColor} size={16} />
        )}
        <Text
          style={[
            styles.preferenceGroupTitle,
            { color: controlColor },
            language === "ar" && styles.preferenceTextArabic,
          ]}
        >
          {t("controls.theme")}
        </Text>
      </View>
      <View style={[styles.preferenceControls, isRTL && styles.rowReverse]}>
        {themeOptions.map((option) => (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{
              checked: themePreference === option.value,
            }}
            hitSlop={6}
            key={option.value}
            onPress={() => {
              pressFeedback();
              setThemePreference(option.value);
            }}
            style={({ pressed }) =>
              buttonStyle(themePreference === option.value, pressed)
            }
          >
            {option.icon}
            <Text
              style={[
                styles.preferenceText,
                { color: controlColor },
                language === "ar" && styles.preferenceTextArabic,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Screen({
  children,
  headerEnd,
  onRefresh,
  refreshing,
  scrollable = true,
  subtitle,
  title,
  tone = "app",
}: {
  children: React.ReactNode;
  headerEnd?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollable?: boolean;
  subtitle?: string;
  title?: string;
  tone?: ScreenTone;
}) {
  const { direction, theme } = usePreferences();
  const palette = useThemePalette();
  const isAuth = tone === "auth";
  const isDark = theme === "dark";
  const onDark = isAuth || isDark;
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const horizontalPadding = isCompact ? 12 : 18;
  const contentMaxWidth = isAuth ? 520 : 720;
  const scrollRef = useRef<ScrollView | null>(null);
  const ensureInputVisible = useCallback((target?: null | number) => {
    if (!target) return;
    setTimeout(() => {
      const responder = scrollRef.current as
        | (ScrollView & {
            scrollResponderScrollNativeHandleToKeyboard?: (
              nodeHandle: number,
              additionalOffset?: number,
              preventNegativeScrollOffset?: boolean,
            ) => void;
          })
        | null;
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(
        target,
        132,
        true,
      );
    }, 80);
  }, []);
  const contentStyle = [
    styles.scroll,
    {
      maxWidth: contentMaxWidth,
      paddingHorizontal: horizontalPadding,
      width: "100%" as const,
    },
    isAuth && styles.authScroll,
    direction === "rtl" && styles.rtlContent,
  ];
  const staticContentStyle = [
    styles.staticContent,
    {
      maxWidth: contentMaxWidth,
      paddingHorizontal: horizontalPadding,
      width: "100%" as const,
    },
    direction === "rtl" && styles.rtlContent,
  ];
  const headerNode = title ? (
    <View
      style={[
        styles.screenHeader,
        {
          backgroundColor: onDark
            ? "rgba(32,22,42,0.72)"
            : "rgba(255,255,255,0.82)",
          borderColor: onDark
            ? "rgba(255,255,255,0.10)"
            : "rgba(86,132,154,0.16)",
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.screenHeaderTop,
          direction === "rtl" && styles.rowReverse,
        ]}
      >
        <BrandLockup compact onDark={onDark} />
        {!isAuth ? headerEnd : null}
      </View>
      <Text
        style={[
          styles.screenTitle,
          { color: onDark ? "#ffffff" : palette.text },
          direction === "rtl" && styles.textRight,
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.screenSubtitle,
            { color: onDark ? colors.darkMuted : palette.muted },
            direction === "rtl" && styles.textRight,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  ) : null;

  return (
    <LinearGradient
      colors={
        isAuth
          ? gradients.hero
          : isDark
            ? gradients.appDark
            : gradients.appLight
      }
      style={styles.root}
    >
      <StatusBar style={onDark ? "light" : "dark"} />
      {isAuth || isDark ? (
        <>
          <View style={[styles.glow, styles.glowAccent]} />
          <View style={[styles.glow, styles.glowPrimary]} />
        </>
      ) : null}
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          style={styles.safe}
        >
          <KeyboardAwareScrollContext.Provider value={{ ensureInputVisible }}>
            {scrollable ? (
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={contentStyle}
                contentInsetAdjustmentBehavior="automatic"
                decelerationRate="fast"
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  onRefresh ? (
                    <RefreshControl
                      refreshing={Boolean(refreshing)}
                      onRefresh={onRefresh}
                      tintColor={onDark ? "#ffffff" : colors.primary}
                    />
                  ) : undefined
                }
              >
                {headerNode}
                {children}
              </ScrollView>
            ) : (
              <View style={staticContentStyle}>
                {headerNode}
                {children}
              </View>
            )}
          </KeyboardAwareScrollContext.Provider>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Card({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "muted";
}) {
  const { theme } = usePreferences();

  return (
    <View
      style={[
        styles.card,
        theme === "dark" && styles.cardDark,
        tone === "muted" && styles.cardMuted,
        theme === "dark" && tone === "muted" && styles.cardMutedDark,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  action,
  onActionPress,
  title,
}: {
  action?: string;
  onActionPress?: () => void;
  title: string;
}) {
  const { direction } = usePreferences();
  const textStyles = useTextStyles();
  const isRTL = direction === "rtl";

  return (
    <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
      <Text style={textStyles.strong}>{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          disabled={!onActionPress}
          hitSlop={8}
          onPress={() => {
            pressFeedback();
            onActionPress?.();
          }}
          style={({ pressed }) => pressed && styles.buttonPressed}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Avatar({
  label,
  size = 48,
  uri,
}: {
  label?: string;
  size?: number;
  uri?: string;
}) {
  const palette = useThemePalette();
  const initials = (label ?? "SC").slice(0, 2).toUpperCase();

  if (uri) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri }}
        style={[
          styles.avatarImage,
          {
            borderColor: palette.border,
            borderRadius: size / 2,
            height: size,
            width: size,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarFallbackText,
          { fontSize: Math.max(14, size * 0.34) },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Button({
  children,
  disabled,
  accessibilityLabel,
  loading,
  onPress,
  tone = "primary",
}: {
  children: React.ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  tone?: "accent" | "danger" | "primary" | "secondary";
}) {
  const isPrimary = tone === "primary" || tone === "accent";
  const palette = useThemePalette();
  const { language } = usePreferences();
  const buttonFamily = language === "ar" ? fonts.arabicBold : fonts.bodyBold;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      android_ripple={{
        color:
          tone === "primary" || tone === "accent"
            ? "rgba(255,255,255,0.16)"
            : "rgba(102,60,109,0.10)",
      }}
      disabled={disabled || loading}
      onPress={() => {
        pressFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.buttonShell,
        tone === "secondary" && [
          styles.buttonSecondary,
          {
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.border,
          },
        ],
        tone === "danger" && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={
            tone === "accent"
              ? [colors.accent, colors.accentDark]
              : gradients.brand
          }
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.buttonGradient}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : null}
          <Text style={[styles.buttonText, { fontFamily: buttonFamily }]}>
            {children}
          </Text>
        </LinearGradient>
      ) : (
        <>
          {loading ? (
            <ActivityIndicator
              color={tone === "danger" ? "#ffffff" : colors.primary}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { fontFamily: buttonFamily },
              tone === "secondary" && { color: palette.text },
            ]}
          >
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  autoCapitalize = "none",
  autoComplete,
  error,
  keyboardType,
  label,
  leftIcon,
  multiline,
  onChangeText,
  placeholder,
  rightIcon,
  returnKeyType,
  secureTextEntry,
  textContentType,
  value,
}: {
  autoCapitalize?: "characters" | "none" | "sentences" | "words";
  autoComplete?: TextInputProps["autoComplete"];
  error?: string;
  keyboardType?: TextInputProps["keyboardType"];
  label: string;
  leftIcon?: React.ReactNode;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  rightIcon?: React.ReactNode;
  returnKeyType?: TextInputProps["returnKeyType"];
  secureTextEntry?: boolean;
  textContentType?: TextInputProps["textContentType"];
  value: string;
}) {
  const [focused, setFocused] = useState(false);
  const { direction, language } = usePreferences();
  const palette = useThemePalette();
  const isRTL = direction === "rtl";
  const family = language === "ar" ? fonts.arabic : fonts.body;
  const labelFamily = language === "ar" ? fonts.arabicBold : fonts.bodyBold;
  const { ensureInputVisible } = useKeyboardAwareInput();

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          {
            color: palette.text,
            fontFamily: labelFamily,
            textAlign: isRTL ? "right" : "left",
          },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: palette.input, borderColor: palette.border },
          isRTL && styles.rowReverse,
          focused && styles.inputFocused,
          error && styles.inputError,
          multiline && styles.textareaRow,
        ]}
      >
        {leftIcon ? <View style={styles.inputIcon}>{leftIcon}</View> : null}
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setFocused(true);
            ensureInputVisible(event.nativeEvent.target);
          }}
          placeholder={placeholder}
          placeholderTextColor={palette.placeholder}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          textContentType={textContentType}
          style={[
            styles.input,
            {
              color: palette.text,
              fontFamily: family,
              textAlign: isRTL ? "right" : "left",
              writingDirection: direction,
            },
            leftIcon ? styles.inputWithIcon : null,
            multiline && styles.textarea,
          ]}
          value={value}
        />
        {rightIcon ? <View style={styles.inputIcon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.error, isRTL && styles.textRight]}>{error}</Text>
      ) : null}
    </View>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "danger" | "neutral" | "success" | "warning";
}) {
  const { language } = usePreferences();
  const badgeFamily = language === "ar" ? fonts.arabicBold : fonts.bodyBold;
  return (
    <View
      style={[
        styles.badge,
        tone === "success" && styles.badgeSuccess,
        tone === "warning" && styles.badgeWarning,
        tone === "danger" && styles.badgeDanger,
      ]}
    >
      <Text style={[styles.badgeText, { fontFamily: badgeFamily }]}>
        {children}
      </Text>
    </View>
  );
}

export function EmptyState({
  action,
  body,
  icon,
  title,
}: {
  action?: { href: string; label: string };
  body: string;
  icon?: React.ReactNode;
  title: string;
}) {
  const themedText = useTextStyles();
  const palette = useThemePalette();

  return (
    <Card>
      {icon ? (
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <Text style={themedText.h2}>{title}</Text>
      <Text style={themedText.body}>{body}</Text>
      {action ? (
        <Link href={action.href as never} style={styles.link}>
          {action.label}
        </Link>
      ) : null}
    </Card>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  const { language } = usePreferences();
  if (!message) return null;
  const localizedMessage = displayLabel(message, language);
  return (
    <View style={styles.errorBanner}>
      <Text
        style={[
          styles.errorBannerText,
          { fontFamily: language === "ar" ? fonts.arabic : fonts.body },
        ]}
      >
        {localizedMessage}
      </Text>
    </View>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const t = useT();
  const themedText = useTextStyles();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={themedText.body}>{label ?? t("common.loading")}</Text>
    </View>
  );
}

export const text = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  h1: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 32,
    lineHeight: 38,
  },
  h2: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 28,
  },
  overline: {
    color: colors.accentDark,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  strong: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  alignStart: {
    alignSelf: "flex-start",
  },
  avatarFallback: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: colors.primaryDark,
    fontFamily: fonts.bodyBold,
  },
  avatarImage: {
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
  },
  authScroll: {
    justifyContent: "center",
    minHeight: "100%",
    paddingBottom: 34,
    paddingTop: 34,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.panelSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  badgeSuccess: {
    backgroundColor: colors.successSoft,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  badgeWarning: {
    backgroundColor: colors.warningSoft,
  },
  brandCopyCentered: {
    alignItems: "center",
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  brandLockupCentered: {
    flexDirection: "column",
    gap: 10,
  },
  brandLockupCompact: {
    gap: 10,
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: "#ffffff",
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    letterSpacing: 0,
  },
  brandNameCompact: {
    fontSize: 20,
  },
  brandTagline: {
    color: colors.darkMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonGradient: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  buttonSecondary: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonSecondaryText: {
    color: colors.text,
  },
  buttonShell: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#ffffff",
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: "rgba(86,132,154,0.16)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    elevation: 1,
    padding: 16,
    shadowColor: "#5B6E78",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  cardMuted: {
    backgroundColor: colors.panelSoft,
  },
  cardDark: {
    backgroundColor: "#24172F",
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
  },
  cardMutedDark: {
    backgroundColor: "#30203B",
  },
  preferenceButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  preferenceButtonCompact: {
    minHeight: 34,
    paddingHorizontal: 10,
  },
  preferenceControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  preferenceGroupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  preferenceGroupTitle: {
    color: "#ffffff",
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  preferenceStack: {
    gap: 10,
  },
  preferenceText: {
    color: "#ffffff",
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  preferenceTextArabic: {
    fontFamily: fonts.arabicBold,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  errorBannerText: {
    color: "#991B1B",
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 7,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 0,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputIcon: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    width: 42,
  },
  inputRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputWithIcon: {
    paddingStart: 2,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    marginTop: 4,
  },
  loading: {
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  muted: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  glow: {
    borderRadius: 999,
    height: 260,
    opacity: 0.25,
    position: "absolute",
    width: 260,
  },
  glowAccent: {
    backgroundColor: colors.accent,
    end: -110,
    top: 18,
  },
  glowPrimary: {
    backgroundColor: colors.primary,
    bottom: 50,
    start: -120,
  },
  root: {
    flex: 1,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  rtlContent: {
    direction: "rtl",
  },
  safe: {
    flex: 1,
  },
  screenHeader: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 1,
    gap: 8,
    marginBottom: 4,
    padding: 14,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  screenSubtitle: {
    color: colors.darkMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  screenTitle: {
    color: "#ffffff",
    fontFamily: fonts.bodyBold,
    fontSize: 25,
    lineHeight: 31,
    marginTop: 3,
  },
  scroll: {
    alignSelf: "center",
    gap: 16,
    paddingBottom: 142,
    paddingTop: 14,
  },
  staticContent: {
    alignSelf: "center",
    flex: 1,
    gap: 12,
    paddingTop: 14,
  },
  screenHeaderTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionAction: {
    color: colors.accentDark,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  textRight: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  textarea: {
    minHeight: 108,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  textareaRow: {
    alignItems: "flex-start",
  },
});

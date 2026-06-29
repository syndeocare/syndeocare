export const spacing = {
  0: 0,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
} as const;

export const radii = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  xxlarge: 26,
  pill: 999,
} as const;

export const layout = {
  compactWidth: 380,
  contentMaxWidth: 720,
  authContentMaxWidth: 520,
  tabBarHeight: 70,
  tabBarCompactHeight: 66,
  tabBarSafeGap: 8,
  minBottomInset: 14,
  scrollBottomGap: 48,
  keyboardInputOffset: 132,
} as const;

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
} as const;

export const fonts = {
  arabic: "Cairo_400Regular",
  arabicBold: "Cairo_700Bold",
  arabicMedium: "Cairo_500Medium",
  body: "Ubuntu_400Regular",
  bodyBold: "Ubuntu_700Bold",
  bodyMedium: "Ubuntu_500Medium",
} as const;

export const shadows = {
  card: {
    elevation: 1,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  floating: {
    elevation: 10,
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
} as const;

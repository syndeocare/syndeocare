import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  MessageCircle,
  User,
} from "lucide-react-native";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, useThemePalette } from "../../src/components/ui";
import { listConversations, listNotifications } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { syncAppBadge } from "../../src/lib/notifications";
import { usePreferences, useT } from "../../src/lib/preferences";

export default function TabsLayout() {
  const t = useT();
  const { language, theme } = usePreferences();
  const { session } = useAuth();
  const palette = useThemePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const tabBarWidth = Math.min(width - 28, 520);
  const tabBarSide = Math.max(14, (width - tabBarWidth) / 2);
  const tabBarHeight = compact ? 66 : 70;
  const isDark = theme === "dark";
  const notificationsQuery = useQuery({
    enabled: Boolean(session),
    queryFn: listNotifications,
    queryKey: ["notifications"],
    refetchInterval: 20_000,
  });
  const conversationsQuery = useQuery({
    enabled: Boolean(session),
    queryFn: listConversations,
    queryKey: ["conversations"],
    refetchInterval: 15_000,
  });
  const unreadAlerts =
    notificationsQuery.data?.items.filter(
      (notification) => !notification.isRead,
    ).length ?? 0;
  const unreadMessages =
    conversationsQuery.data?.items.reduce(
      (total, conversation) => total + (conversation.unreadCount ?? 0),
      0,
    ) ?? 0;

  useEffect(() => {
    void syncAppBadge(unreadAlerts + unreadMessages);
  }, [unreadAlerts, unreadMessages]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#ffffff" : colors.primary,
        tabBarBadgeStyle: {
          backgroundColor: colors.danger,
          color: "#ffffff",
          fontSize: 10,
          fontWeight: "900",
          minWidth: 18,
        },
        tabBarInactiveTintColor: palette.muted,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: {
          marginTop: 1,
        },
        tabBarItemStyle: {
          borderRadius: compact ? 16 : 18,
          marginHorizontal: compact ? 2 : 4,
          minHeight: compact ? 46 : 50,
          paddingVertical: compact ? 3 : 4,
        },
        tabBarActiveBackgroundColor: isDark
          ? "rgba(161,83,172,0.30)"
          : colors.primarySoft,
        tabBarLabelStyle: {
          fontFamily: language === "ar" ? fonts.arabicBold : fonts.bodyBold,
          fontSize: compact ? 10 : 11,
          fontWeight: "800",
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: isDark
            ? "rgba(32,22,42,0.96)"
            : "rgba(255,255,255,0.96)",
          borderColor: palette.border,
          borderRadius: compact ? 22 : 26,
          borderWidth: 1,
          bottom: Math.max(14, insets.bottom + 8),
          elevation: 10,
          height: tabBarHeight,
          left: tabBarSide,
          paddingBottom: compact ? 7 : 9,
          paddingHorizontal: compact ? 8 : 11,
          paddingTop: compact ? 7 : 9,
          position: "absolute",
          right: tabBarSide,
          shadowColor: palette.shadow,
          shadowOffset: { height: -8, width: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: t("tabs.shifts"),
          tabBarIcon: ({ color, size }) => (
            <BriefcaseBusiness color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tabs.messages"),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: t("tabs.alerts"),
          tabBarBadge: unreadAlerts > 0 ? unreadAlerts : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

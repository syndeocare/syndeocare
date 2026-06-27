import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  MessageCircle,
  User,
} from "lucide-react-native";
import { useEffect } from "react";

import { colors, useThemePalette } from "../../src/components/ui";
import { listConversations, listNotifications } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { syncAppBadge } from "../../src/lib/notifications";
import { useT } from "../../src/lib/preferences";

export default function TabsLayout() {
  const t = useT();
  const { session } = useAuth();
  const palette = useThemePalette();
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
        tabBarActiveTintColor: colors.primary,
        tabBarBadgeStyle: {
          backgroundColor: colors.danger,
          color: "#ffffff",
          fontSize: 10,
          fontWeight: "900",
          minWidth: 18,
        },
        tabBarInactiveTintColor: palette.muted,
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 2,
          minHeight: 52,
          paddingVertical: 4,
        },
        tabBarActiveBackgroundColor:
          palette.background === colors.dark
            ? "rgba(102,60,109,0.34)"
            : colors.primarySoft,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800" },
        tabBarStyle: {
          backgroundColor:
            palette.background === colors.dark
              ? "rgba(32,22,42,0.96)"
              : "rgba(255,255,255,0.96)",
          borderColor: palette.border,
          borderRadius: 26,
          borderWidth: 1,
          bottom: 10,
          elevation: 8,
          height: 72,
          left: 14,
          paddingBottom: 8,
          paddingHorizontal: 10,
          paddingTop: 8,
          position: "absolute",
          right: 14,
          shadowColor: palette.shadow,
          shadowOffset: { height: -8, width: 0 },
          shadowOpacity: 0.08,
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

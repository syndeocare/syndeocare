import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  MessageCircle,
  User,
} from "lucide-react-native";
import type React from "react";
import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, useThemePalette } from "../../src/components/ui";
import { listConversations, listNotifications } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { hapticSelection } from "../../src/lib/haptics";
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
      tabBar={(props) => (
        <SyndeoTabBar
          {...props}
          compact={compact}
          direction={language === "ar" ? "rtl" : "ltr"}
          isDark={isDark}
          palette={palette}
          tabBarHeight={tabBarHeight}
          tabBarSide={tabBarSide}
          tabBarWidth={tabBarWidth}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarBadgeStyle: {
          backgroundColor: colors.danger,
          color: "#ffffff",
          fontSize: 10,
          fontWeight: "900",
          minWidth: 18,
        },
        tabBarInactiveTintColor: palette.muted,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: styles.tabBarIconSlot,
        tabBarItemStyle: {
          borderRadius: compact ? 16 : 18,
          marginHorizontal: compact ? 2 : 4,
          minHeight: compact ? 46 : 50,
          paddingVertical: compact ? 3 : 4,
        },
        tabBarActiveBackgroundColor: "transparent",
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <LayoutDashboard
                color={focused ? "#ffffff" : color}
                size={focused ? 23 : 21}
              />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: t("tabs.shifts"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <BriefcaseBusiness
                color={focused ? "#ffffff" : color}
                size={focused ? 23 : 21}
              />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tabs.messages"),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <MessageCircle
                color={focused ? "#ffffff" : color}
                size={focused ? 24 : 21}
              />
            </TabIcon>
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <User
                color={focused ? "#ffffff" : color}
                size={focused ? 23 : 21}
              />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

type SyndeoTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0] & {
  compact: boolean;
  direction: "ltr" | "rtl";
  isDark: boolean;
  palette: ReturnType<typeof useThemePalette>;
  tabBarHeight: number;
  tabBarSide: number;
  tabBarWidth: number;
};

const ltrTabOrder = ["index", "shifts", "messages", "profile"];
const rtlTabOrder = ["profile", "messages", "shifts", "index"];
type TabRoute = SyndeoTabBarProps["state"]["routes"][number];

function SyndeoTabBar({
  compact,
  descriptors,
  direction,
  isDark,
  navigation,
  palette,
  state,
  tabBarHeight,
  tabBarSide,
  tabBarWidth,
}: SyndeoTabBarProps) {
  const insets = useSafeAreaInsets();
  const orderedRouteNames = direction === "rtl" ? rtlTabOrder : ltrTabOrder;
  const visibleRoutes = orderedRouteNames
    .map((routeName) => state.routes.find((route) => route.name === routeName))
    .filter((route): route is TabRoute => Boolean(route));

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: isDark
            ? "rgba(32,22,42,0.96)"
            : "rgba(255,255,255,0.96)",
          borderColor: palette.border,
          bottom: Math.max(14, insets.bottom + 8),
          height: tabBarHeight,
          left: tabBarSide,
          paddingBottom: compact ? 7 : 9,
          paddingHorizontal: compact ? 8 : 11,
          paddingTop: compact ? 7 : 9,
          right: tabBarSide,
          shadowColor: palette.shadow,
          width: tabBarWidth,
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const routeIndex = state.routes.findIndex(
          (stateRoute) => stateRoute.key === route.key,
        );
        const focused = state.index === routeIndex;
        const { options } = descriptors[route.key];
        const label =
          typeof options.title === "string" ? options.title : route.name;
        const color = focused ? "#ffffff" : palette.muted;
        const badge = options.tabBarBadge;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : undefined}
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: "tabPress",
              });

              if (!focused && !event.defaultPrevented) {
                hapticSelection();
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => {
              navigation.emit({
                target: route.key,
                type: "tabLongPress",
              });
            }}
            style={[
              styles.tabItem,
              {
                borderRadius: compact ? 16 : 18,
                marginHorizontal: compact ? 2 : 4,
                minHeight: compact ? 46 : 50,
                paddingVertical: compact ? 3 : 4,
              },
            ]}
          >
            <View style={styles.tabIconWrap}>
              {options.tabBarIcon?.({
                color,
                focused,
                size: focused ? 23 : 21,
              })}
              {typeof badge === "number" && badge > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {badge > 99 ? "99+" : badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color,
                  fontFamily:
                    direction === "rtl" ? fonts.arabicBold : fonts.bodyBold,
                  fontSize: compact ? 10 : 11,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({
  children,
  focused,
}: {
  children: React.ReactNode;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    elevation: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  tabBarIconSlot: {
    marginTop: -2,
  },
  tabLabel: {
    fontWeight: "800",
    marginTop: 1,
    maxWidth: "100%",
    textAlign: "center",
  },
  tabBadge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
    position: "absolute",
    right: -5,
    top: -3,
  },
  tabBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  tabIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  tabIconActive: {
    backgroundColor: colors.primary,
    height: 46,
    shadowColor: colors.primary,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    transform: [{ translateY: -5 }],
    width: 46,
  },
});

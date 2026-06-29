import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, colors, useThemePalette } from "./ui";
import { listNotifications } from "../lib/api";
import { useAuth } from "../lib/auth";

export function AppHeaderActions() {
  const { session } = useAuth();
  const palette = useThemePalette();
  const notificationsQuery = useQuery({
    enabled: Boolean(session),
    queryFn: listNotifications,
    queryKey: ["notifications"],
    refetchInterval: 20_000,
  });
  const unreadCount =
    notificationsQuery.data?.items.filter((item) => !item.isRead).length ?? 0;

  return (
    <View style={styles.actions}>
      <Link asChild href="/(tabs)/notifications">
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <Bell color={palette.text} size={20} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Link>
      <Link asChild href="/(tabs)/profile">
        <Pressable
          accessibilityLabel="Profile and settings"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar
            label={session?.principal.displayName}
            size={42}
            uri={session?.principal.profileImageUrl}
          />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 2,
    end: -4,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    top: -5,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});

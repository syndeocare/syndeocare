import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Screen,
  SectionHeader,
  colors,
  useTextStyles,
  useThemePalette,
} from "../../src/components/ui";
import { AppHeaderActions } from "../../src/components/AppHeaderActions";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../src/lib/api";
import { displayLabel, formatDateTime } from "../../src/lib/format";
import { hapticError, hapticSuccess } from "../../src/lib/haptics";
import { usePreferences, useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";

export default function NotificationsScreen() {
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { direction, language } = usePreferences();
  const isRTL = direction === "rtl";
  const notificationsQuery = useQuery({
    queryFn: listNotifications,
    queryKey: ["notifications"],
    refetchInterval: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onError: () => hapticError(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      hapticSuccess();
    },
  });
  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onError: () => hapticError(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      hapticSuccess();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onError: () => hapticError(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      hapticSuccess();
    },
  });

  return (
    <Screen
      headerEnd={<AppHeaderActions />}
      onRefresh={() => void notificationsQuery.refetch()}
      refreshing={notificationsQuery.isFetching}
      title={t("notifications.title")}
    >
      {notificationsQuery.isLoading && !notificationsQuery.data ? (
        <LoadingBlock label={t("notifications.loading")} />
      ) : null}
      <ErrorBanner
        message={
          notificationsQuery.error instanceof Error
            ? notificationsQuery.error.message
            : markAllMutation.error instanceof Error
              ? markAllMutation.error.message
              : markOneMutation.error instanceof Error
                ? markOneMutation.error.message
                : deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : undefined
        }
      />

      {(notificationsQuery.data?.items.length ?? 0) > 0 ? (
        <SectionHeader
          action={t("notifications.markAllRead")}
          onActionPress={() => markAllMutation.mutate()}
          title={t("notifications.title")}
        />
      ) : null}

      {notificationsQuery.data?.items.length ? (
        notificationsQuery.data.items.map((notification) => (
          <Card
            key={notification.id}
            tone={notification.isRead ? "default" : "muted"}
          >
            <View style={[styles.notificationTop, isRTL && styles.rowReverse]}>
              <View
                style={[
                  styles.iconShell,
                  {
                    backgroundColor: notification.isRead
                      ? palette.surfaceMuted
                      : colors.warningSoft,
                  },
                ]}
              >
                <Bell
                  color={notification.isRead ? colors.muted : colors.warning}
                  size={18}
                />
              </View>
              <View style={styles.grow}>
                <View style={styles.headerLine}>
                  <Text style={[text.h2, styles.title]}>
                    {displayLabel(notification.title, language)}
                  </Text>
                  <Badge tone={notification.isRead ? "neutral" : "warning"}>
                    {notification.isRead
                      ? t("notifications.read")
                      : t("notifications.new")}
                  </Badge>
                </View>
                <Text style={text.body}>
                  {displayLabel(notification.message, language)}
                </Text>
                <Text style={[styles.time, { color: palette.muted }]}>
                  {formatDateTime(notification.createdAt, language)}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {!notification.isRead ? (
                <Button
                  loading={markOneMutation.isPending}
                  onPress={() => markOneMutation.mutate(notification.id)}
                  tone="secondary"
                >
                  {t("notifications.markRead")}
                </Button>
              ) : null}
              <Button
                loading={deleteMutation.isPending}
                onPress={() => deleteMutation.mutate(notification.id)}
                tone="secondary"
              >
                {t("notifications.delete")}
              </Button>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState
          body={t("notifications.noNotificationsBody")}
          title={t("notifications.noNotificationsTitle")}
          icon={<Bell color={colors.primary} size={26} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  grow: {
    flex: 1,
    gap: 6,
  },
  headerLine: {
    alignItems: "flex-start",
    gap: 8,
  },
  iconShell: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  notificationTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  time: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
  },
});

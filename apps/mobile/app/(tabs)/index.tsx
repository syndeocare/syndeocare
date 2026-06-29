import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  MessageCircle,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Screen,
  colors,
  fonts,
  useThemePalette,
  useTextStyles,
} from "../../src/components/ui";
import { AppHeaderActions } from "../../src/components/AppHeaderActions";
import {
  getMe,
  listBookings,
  listConversations,
  listJobs,
  listNotifications,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { displayLabel, verificationStatusLabel } from "../../src/lib/format";
import { hapticSelection } from "../../src/lib/haptics";
import { interpolate, usePreferences, useT } from "../../src/lib/preferences";

export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const t = useT();
  const { direction, language } = usePreferences();
  const text = useTextStyles();
  const isRTL = direction === "rtl";
  const [me, bookings, jobs, conversations, notifications] = useQueries({
    queries: [
      { queryFn: getMe, queryKey: ["me"] },
      { queryFn: listBookings, queryKey: ["bookings"] },
      { queryFn: listJobs, queryKey: ["jobs"] },
      { queryFn: listConversations, queryKey: ["conversations"] },
      { queryFn: listNotifications, queryKey: ["notifications"] },
    ],
  });

  const queries = [me, bookings, jobs, conversations, notifications];
  const firstError = queries.find((query) => query.error)?.error;
  const unread =
    notifications.data?.items.filter((notification) => !notification.isRead)
      .length ?? 0;
  const name =
    me.data?.displayName ??
    session?.principal.displayName ??
    t("dashboard.there");
  const role = session?.principal.role;

  const refetchAll = () => {
    queries.forEach((query) => void query.refetch());
  };

  return (
    <Screen
      headerEnd={<AppHeaderActions />}
      onRefresh={refetchAll}
      refreshing={queries.some((query) => query.isFetching)}
      title={interpolate(t("dashboard.hi"), { name })}
    >
      {me.isLoading ? <LoadingBlock label={t("dashboard.loading")} /> : null}
      <ErrorBanner
        message={firstError instanceof Error ? firstError.message : undefined}
      />

      <Card>
        <View style={styles.workspaceTop}>
          <Badge
            tone={
              session?.principal.verificationStatus === "approved"
                ? "success"
                : "warning"
            }
          >
            {verificationStatusLabel(
              session?.principal.verificationStatus,
              language,
            )}
          </Badge>
          <ChevronRight
            color={colors.accentDark}
            size={18}
            style={isRTL ? styles.chevronRtl : undefined}
          />
        </View>
        <Text style={text.h2}>
          {role === "clinic"
            ? t("dashboard.clinicOperations")
            : t("dashboard.professionalWorkspace")}
        </Text>
        <Text style={text.body}>
          {role === "clinic"
            ? t("dashboard.clinicBody")
            : t("dashboard.professionalBody")}
        </Text>
      </Card>

      <View style={styles.statsGrid}>
        <StatCard
          icon={<CalendarCheck color={colors.primary} size={21} />}
          label={t("dashboard.bookings")}
          onPress={() => router.push("/(tabs)/shifts")}
          value={bookings.data?.total ?? 0}
        />
        <StatCard
          icon={<BriefcaseBusiness color={colors.primary} size={21} />}
          label={t("dashboard.openShifts")}
          onPress={() => router.push("/(tabs)/shifts")}
          value={jobs.data?.total ?? 0}
        />
        <StatCard
          icon={<Bell color={colors.accentDark} size={21} />}
          label={t("dashboard.unreadAlerts")}
          onPress={() => router.push("/(tabs)/notifications")}
          value={unread}
          variant="accent"
        />
        <StatCard
          icon={<MessageCircle color={colors.accentDark} size={21} />}
          label={t("dashboard.messages")}
          onPress={() => router.push("/(tabs)/messages")}
          value={conversations.data?.total ?? 0}
          variant="accent"
        />
      </View>

      {conversations.data?.items.length ? (
        <Card>
          <View style={styles.workspaceTop}>
            <Text style={text.strong}>{t("dashboard.latestConversation")}</Text>
            <MessageCircle color={colors.primary} size={18} />
          </View>
          <Text style={text.h2}>
            {displayLabel(conversations.data.items[0].displayName, language)}
          </Text>
          <Text style={text.body}>
            {conversations.data.items[0].lastMessage
              ? displayLabel(conversations.data.items[0].lastMessage, language)
              : t("dashboard.noRecentMessage")}
          </Text>
        </Card>
      ) : (
        <EmptyState
          action={{
            href: "/(tabs)/messages",
            label: t("dashboard.openMessages"),
          }}
          body={t("dashboard.noConversationsBody")}
          title={t("dashboard.noConversationsTitle")}
        />
      )}
    </Screen>
  );
}

function StatCard({
  icon,
  label,
  onPress,
  value,
  variant = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  value: number;
  variant?: "accent" | "primary";
}) {
  const palette = useThemePalette();
  const { language } = usePreferences();
  const labelFamily = language === "ar" ? fonts.arabic : fonts.body;
  const valueFamily = language === "ar" ? fonts.arabicBold : fonts.bodyBold;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={() => {
        hapticSelection();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.statCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.statPressed,
      ]}
    >
      <View
        style={[
          styles.statIcon,
          variant === "accent" ? styles.statIconAccent : styles.statIconPrimary,
        ]}
      >
        {icon}
      </View>
      <View style={styles.statCopy}>
        <Text
          style={[
            styles.statValue,
            { color: palette.text, fontFamily: valueFamily },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.statLabel,
            { color: palette.muted, fontFamily: labelFamily },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevronRtl: {
    transform: [{ rotate: "180deg" }],
  },
  statCard: {
    alignItems: "flex-start",
    backgroundColor: colors.panel,
    borderColor: "rgba(86,132,154,0.16)",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 10,
    minHeight: 112,
    padding: 14,
  },
  statCopy: {
    gap: 2,
  },
  statIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  statIconAccent: {
    backgroundColor: "rgba(86,132,154,0.12)",
  },
  statIconPrimary: {
    backgroundColor: "rgba(102,60,109,0.12)",
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 34,
  },
  workspaceTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

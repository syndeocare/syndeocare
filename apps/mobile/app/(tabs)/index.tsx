import { useQueries } from "@tanstack/react-query";
import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  MessageCircle,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

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
import {
  getMe,
  listBookings,
  listConversations,
  listJobs,
  listNotifications,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { interpolate, useT } from "../../src/lib/preferences";

export default function DashboardScreen() {
  const { session } = useAuth();
  const t = useT();
  const text = useTextStyles();
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
            {session?.principal.verificationStatus.replace("_", " ")}
          </Badge>
          <ChevronRight color={colors.accentDark} size={18} />
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
          value={bookings.data?.total ?? 0}
        />
        <StatCard
          icon={<BriefcaseBusiness color={colors.primary} size={21} />}
          label={t("dashboard.openShifts")}
          value={jobs.data?.total ?? 0}
        />
        <StatCard
          icon={<Bell color={colors.accentDark} size={21} />}
          label={t("dashboard.unreadAlerts")}
          value={unread}
          variant="accent"
        />
        <StatCard
          icon={<MessageCircle color={colors.accentDark} size={21} />}
          label={t("dashboard.messages")}
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
          <Text style={text.h2}>{conversations.data.items[0].displayName}</Text>
          <Text style={text.body}>
            {conversations.data.items[0].lastMessage ??
              t("dashboard.noRecentMessage")}
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
  value,
  variant = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: "accent" | "primary";
}) {
  const palette = useThemePalette();

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
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
        <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: palette.muted }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

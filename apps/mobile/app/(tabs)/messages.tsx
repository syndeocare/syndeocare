import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Screen,
  colors,
  useTextStyles,
  useThemePalette,
} from "../../src/components/ui";
import { listConversations } from "../../src/lib/api";
import { interpolate, usePreferences, useT } from "../../src/lib/preferences";

export default function MessagesScreen() {
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { direction } = usePreferences();
  const isRTL = direction === "rtl";
  const conversationsQuery = useQuery({
    queryFn: listConversations,
    queryKey: ["conversations"],
    refetchInterval: 20_000,
  });

  return (
    <Screen
      onRefresh={() => void conversationsQuery.refetch()}
      refreshing={conversationsQuery.isFetching}
      title={t("messages.title")}
    >
      {conversationsQuery.isLoading ? (
        <LoadingBlock label={t("messages.loading")} />
      ) : null}
      <ErrorBanner
        message={
          conversationsQuery.error instanceof Error
            ? conversationsQuery.error.message
            : undefined
        }
      />

      {conversationsQuery.data?.items.length ? (
        conversationsQuery.data.items.map((conversation) => (
          <Link
            asChild
            href={{
              params: { id: conversation.id },
              pathname: "/conversation/[id]",
            }}
            key={conversation.id}
          >
            <Pressable>
              <Card>
                <View
                  style={[styles.conversationRow, isRTL && styles.rowReverse]}
                >
                  <Avatar label={conversation.displayName} />
                  <View style={styles.grow}>
                    <View style={[styles.row, isRTL && styles.rowReverse]}>
                      <Text numberOfLines={1} style={[text.h2, styles.title]}>
                        {conversation.displayName}
                      </Text>
                      <Text style={[styles.time, { color: palette.muted }]}>
                        {new Date(
                          conversation.lastMessageAt,
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text numberOfLines={2} style={text.body}>
                      {conversation.lastMessage ??
                        t("messages.openConversation")}
                    </Text>
                    {conversation.unreadCount ? (
                      <Badge tone="warning">
                        {interpolate(t("messages.unread"), {
                          count: conversation.unreadCount,
                        })}
                      </Badge>
                    ) : null}
                  </View>
                  <ChevronRight
                    color={colors.accentDark}
                    size={20}
                    style={isRTL ? styles.chevronRtl : undefined}
                  />
                </View>
              </Card>
            </Pressable>
          </Link>
        ))
      ) : (
        <EmptyState
          body={t("messages.noConversationsBody")}
          title={t("messages.noConversationsTitle")}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chevronRtl: {
    transform: [{ rotate: "180deg" }],
  },
  conversationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  grow: {
    flex: 1,
    gap: 6,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  time: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    flex: 1,
  },
});

import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ChevronRight, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Screen,
  colors,
  useTextStyles,
  useThemePalette,
} from "../../src/components/ui";
import { AppHeaderActions } from "../../src/components/AppHeaderActions";
import { listConversations } from "../../src/lib/api";
import { interpolate, usePreferences, useT } from "../../src/lib/preferences";

export default function MessagesScreen() {
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { direction } = usePreferences();
  const isRTL = direction === "rtl";
  const [search, setSearch] = useState("");
  const conversationsQuery = useQuery({
    queryFn: listConversations,
    queryKey: ["conversations"],
    refetchInterval: 20_000,
  });
  const conversations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...(conversationsQuery.data?.items ?? [])]
      .filter((conversation) => {
        if (!needle) return true;
        return (
          conversation.displayName.toLowerCase().includes(needle) ||
          conversation.counterpartRole.toLowerCase().includes(needle) ||
          (conversation.lastMessage ?? "").toLowerCase().includes(needle)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      );
  }, [conversationsQuery.data?.items, search]);

  return (
    <Screen
      headerEnd={<AppHeaderActions />}
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
      <Field
        label={t("messages.search")}
        leftIcon={<Search color={colors.muted} size={18} />}
        onChangeText={setSearch}
        returnKeyType="search"
        value={search}
      />

      {conversations.length ? (
        conversations.map((conversation) => (
          <Link
            asChild
            href={{
              params: { id: conversation.id },
              pathname: "/conversation/[id]",
            }}
            key={conversation.id}
          >
            <Pressable>
              <Card tone={conversation.unreadCount ? "muted" : "default"}>
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
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.role, { color: palette.muted }]}>
                      {conversation.counterpartRole}
                    </Text>
                    <Text numberOfLines={2} style={text.body}>
                      {conversation.lastMessage ??
                        t("messages.openConversation")}
                    </Text>
                    {conversation.unreadCount ? (
                      <View style={styles.unreadLine}>
                        <Badge tone="warning">
                          {interpolate(t("messages.unread"), {
                            count: conversation.unreadCount,
                          })}
                        </Badge>
                      </View>
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
          body={
            search
              ? t("messages.noSearchBody")
              : t("messages.noConversationsBody")
          }
          title={
            search
              ? t("messages.noSearchTitle")
              : t("messages.noConversationsTitle")
          }
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
  role: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  time: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    flex: 1,
  },
  unreadLine: {
    alignItems: "flex-start",
  },
});

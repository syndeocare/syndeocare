import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight, MessageCircle, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  PressableCard,
  Screen,
  colors,
  useTextStyles,
  useThemePalette,
} from "../../src/components/ui";
import { listConversations } from "../../src/lib/api";
import { displayLabel, formatMessageTimestamp } from "../../src/lib/format";
import { interpolate, usePreferences, useT } from "../../src/lib/preferences";

export default function MessagesScreen() {
  const t = useT();
  const router = useRouter();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { direction, language } = usePreferences();
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
      onRefresh={() => void conversationsQuery.refetch()}
      refreshing={conversationsQuery.isFetching}
      showHeader={false}
      title={t("messages.title")}
    >
      {conversationsQuery.isLoading && !conversationsQuery.data ? (
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
        placeholder={t("messages.search")}
        returnKeyType="search"
        value={search}
      />

      {conversations.length ? (
        conversations.map((conversation) => (
          <PressableCard
            accessibilityLabel={`${displayLabel(conversation.displayName, language)} ${t("messages.openConversation")}`}
            key={conversation.id}
            onPress={() =>
              router.push({
                params: {
                  id: conversation.id,
                  name: conversation.displayName,
                  role: conversation.counterpartRole,
                },
                pathname: "/conversation/[id]",
              })
            }
            tone={conversation.unreadCount ? "muted" : "default"}
          >
            <View style={[styles.conversationRow, isRTL && styles.rowReverse]}>
              <View>
                <Avatar label={conversation.displayName} />
                {conversation.unreadCount ? (
                  <View style={styles.unreadAvatarDot} />
                ) : null}
              </View>
              <View style={styles.grow}>
                <View style={[styles.row, isRTL && styles.rowReverse]}>
                  <Text numberOfLines={1} style={[text.h2, styles.title]}>
                    {displayLabel(conversation.displayName, language)}
                  </Text>
                  <Text
                    style={[
                      styles.time,
                      {
                        color: conversation.unreadCount
                          ? colors.primary
                          : palette.muted,
                      },
                    ]}
                  >
                    {formatMessageTimestamp(
                      conversation.lastMessageAt,
                      language,
                    )}
                  </Text>
                </View>
                <Text style={[styles.role, { color: palette.muted }]}>
                  {t(`roles.${conversation.counterpartRole}`)}
                </Text>
                <Text numberOfLines={2} style={text.body}>
                  {conversation.lastMessage
                    ? displayLabel(conversation.lastMessage, language)
                    : t("messages.openConversation")}
                </Text>
                {conversation.unreadCount ? (
                  <View
                    style={[styles.unreadPill, isRTL && styles.unreadPillRtl]}
                  >
                    <Text style={styles.unreadPillText}>
                      {interpolate(t("messages.unread"), {
                        count: conversation.unreadCount,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
              <ChevronRight
                color={colors.accentDark}
                size={20}
                style={isRTL ? styles.chevronRtl : undefined}
              />
            </View>
          </PressableCard>
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
          icon={<MessageCircle color={colors.primary} size={26} />}
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
    fontWeight: "900",
  },
  title: {
    flex: 1,
  },
  unreadAvatarDot: {
    backgroundColor: colors.danger,
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 2,
    bottom: 1,
    height: 14,
    position: "absolute",
    right: 1,
    width: 14,
  },
  unreadPill: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unreadPillRtl: {
    alignSelf: "flex-end",
  },
  unreadPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
});

import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { MessageCircle, Paperclip, Send } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Button,
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
import {
  getChatMediaAccessUrl,
  listMessages,
  sendMessageWithAttachment,
  uploadChatMedia,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { usePreferences, useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { direction, theme } = usePreferences();
  const { session } = useAuth();
  const isRTL = direction === "rtl";
  const [content, setContent] = useState("");
  const [attachment, setAttachment] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const messagesQuery = useQuery({
    enabled: Boolean(id),
    queryFn: () => listMessages(id),
    queryKey: ["conversation", id],
    refetchInterval: 10_000,
  });
  const messages = useMemo(
    () =>
      [...(messagesQuery.data?.items ?? [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [messagesQuery.data?.items],
  );
  const counterpart = messages.find(
    (message) => message.senderActorId !== session?.principal.sub,
  );

  const sendMutation = useMutation({
    mutationFn: async () => {
      const trimmed = content.trim();
      let uploaded: Awaited<ReturnType<typeof uploadChatMedia>> | null = null;

      if (attachment) {
        uploaded = await uploadChatMedia(attachment);
      }

      return sendMessageWithAttachment(id, {
        content:
          trimmed ||
          (uploaded?.fileName
            ? `${t("conversation.attachment")} ${uploaded.fileName}`
            : ""),
        fileName: uploaded?.fileName ?? null,
        fileSize: uploaded?.fileSize ?? null,
        fileType: uploaded?.fileType ?? null,
        fileUrl: uploaded?.fileUrl ?? null,
      });
    },
    onSuccess: async () => {
      setContent("");
      setAttachment(null);
      await queryClient.invalidateQueries({ queryKey: ["conversation", id] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
  const accessMutation = useMutation({
    mutationFn: (fileUrl: string) => getChatMediaAccessUrl(id, fileUrl),
    onSuccess: async (result) => {
      await Linking.openURL(result.signedUrl);
    },
  });

  const pickAttachment = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*"],
    });

    if (!picked.canceled && picked.assets[0]) {
      setAttachment(picked.assets[0]);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        headerEnd={<AppHeaderActions />}
        onRefresh={() => void messagesQuery.refetch()}
        refreshing={messagesQuery.isFetching}
        title={t("conversation.title")}
      >
        {messagesQuery.isLoading ? (
          <LoadingBlock label={t("conversation.loading")} />
        ) : null}
        <ErrorBanner
          message={
            messagesQuery.error instanceof Error
              ? messagesQuery.error.message
              : sendMutation.error instanceof Error
                ? sendMutation.error.message
                : accessMutation.error instanceof Error
                  ? accessMutation.error.message
                  : undefined
          }
        />

        <Card>
          <View style={[styles.conversationHeader, isRTL && styles.rowReverse]}>
            <Avatar
              label={counterpart?.senderRole ?? t("conversation.title")}
            />
            <View style={styles.grow}>
              <Text style={text.h2}>{t("conversation.title")}</Text>
              <Text style={text.body}>
                {counterpart?.senderRole ?? t("conversation.secureThread")}
              </Text>
            </View>
            <MessageCircle color={colors.primary} size={22} />
          </View>
        </Card>

        {messages.length ? (
          messages.map((message, index) => {
            const isMine = message.senderActorId === session?.principal.sub;
            const previous = messages[index - 1];
            const currentDate = new Date(message.createdAt).toDateString();
            const previousDate = previous
              ? new Date(previous.createdAt).toDateString()
              : "";
            const showDate = currentDate !== previousDate;

            return (
              <View key={message.id} style={styles.messageGroup}>
                {showDate ? (
                  <View style={styles.datePill}>
                    <Text style={styles.datePillText}>
                      {new Date(message.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.messageBubble,
                    {
                      alignSelf: isMine ? "flex-end" : "flex-start",
                      backgroundColor:
                        isMine && theme === "dark"
                          ? "#2F1F3A"
                          : isMine
                            ? colors.primarySoft
                            : palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View
                    style={[styles.messageHeader, isRTL && styles.rowReverse]}
                  >
                    <Text style={text.strong}>{message.senderRole}</Text>
                    <Text style={[styles.time, { color: palette.muted }]}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={text.body}>{message.content}</Text>
                  {message.fileName ? (
                    <Pressable
                      disabled={!message.fileUrl || accessMutation.isPending}
                      onPress={() =>
                        message.fileUrl
                          ? accessMutation.mutate(message.fileUrl)
                          : null
                      }
                      style={[styles.fileRow, isRTL && styles.rowReverse]}
                    >
                      <Paperclip color={colors.primaryDark} size={16} />
                      <Text style={styles.file}>
                        {t("conversation.attachment")} {message.fileName}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            body={t("conversation.emptyBody")}
            title={t("conversation.emptyTitle")}
          />
        )}

        <Card>
          <View style={[styles.composerTitle, isRTL && styles.rowReverse]}>
            <Send color={colors.primary} size={18} />
            <Text style={text.strong}>{t("conversation.composerTitle")}</Text>
          </View>
          <Field
            label={t("conversation.message")}
            multiline
            onChangeText={setContent}
            returnKeyType="default"
            value={content}
          />
          {attachment ? (
            <View style={styles.attachmentRow}>
              <Text style={text.body}>{attachment.name}</Text>
              <Pressable onPress={() => setAttachment(null)}>
                <Text style={styles.file}>{t("conversation.removeFile")}</Text>
              </Pressable>
            </View>
          ) : null}
          <Button onPress={pickAttachment} tone="secondary">
            {t("conversation.attachFile")}
          </Button>
          <Button
            disabled={content.trim().length === 0 && !attachment}
            loading={sendMutation.isPending}
            onPress={() => sendMutation.mutate()}
          >
            {t("conversation.send")}
          </Button>
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  attachmentRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
  },
  file: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  fileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  messageBubble: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    maxWidth: "88%",
    padding: 14,
  },
  composerTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  conversationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  datePill: {
    alignSelf: "center",
    backgroundColor: colors.panelSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  datePillText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  grow: {
    flex: 1,
    gap: 2,
  },
  messageGroup: {
    gap: 10,
  },
  messageHeader: {
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
  },
});

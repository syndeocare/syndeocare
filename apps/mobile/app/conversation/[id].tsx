import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { MessageCircle, Paperclip, Send } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Avatar,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Screen,
  colors,
  fonts,
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
import type { UserRole } from "../../src/types";

export default function ConversationScreen() {
  const { id, name, role } = useLocalSearchParams<{
    id: string;
    name?: string;
    role?: UserRole;
  }>();
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { direction, language, theme } = usePreferences();
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
  const currentActorId = session?.principal.actorId;
  const currentProfileId =
    session?.principal.role === "professional"
      ? session.principal.profileId
      : session?.principal.role === "clinic"
        ? session.principal.clinicId
        : undefined;
  const currentRole = session?.principal.role;
  const isOwnMessage = (message: (typeof messages)[number]) => {
    if (currentActorId && message.senderActorId === currentActorId) return true;
    if (currentProfileId && message.senderActorId === currentProfileId) {
      return true;
    }
    if (message.senderActorId === session?.principal.sub) return true;
    return (
      !currentActorId && !currentProfileId && message.senderRole === currentRole
    );
  };
  const counterpart = messages.find((message) => !isOwnMessage(message));
  const counterpartLabel =
    typeof name === "string" && name.trim()
      ? name
      : counterpart?.senderRole
        ? t(`roles.${counterpart.senderRole}`)
        : typeof role === "string"
          ? t(`roles.${role}`)
          : t("conversation.secureThread");

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
            <Avatar label={counterpartLabel} />
            <View style={styles.grow}>
              <Text style={text.h2}>{counterpartLabel}</Text>
              <Text style={text.body}>{t("conversation.secureThread")}</Text>
            </View>
            <MessageCircle color={colors.primary} size={22} />
          </View>
        </Card>

        {messages.length ? (
          messages.map((message, index) => {
            const isMine = isOwnMessage(message);
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
                    isMine
                      ? styles.messageBubbleMine
                      : styles.messageBubbleOther,
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
                    <Text
                      style={[text.strong, isMine && styles.messageSenderMine]}
                    >
                      {isMine
                        ? t("conversation.you")
                        : t(`roles.${message.senderRole}`)}
                    </Text>
                    <Text style={[styles.time, { color: palette.muted }]}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {message.content ? (
                    <Text
                      style={[
                        text.body,
                        styles.messageText,
                        isMine && styles.messageTextMine,
                      ]}
                    >
                      {message.content}
                    </Text>
                  ) : null}
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

        <Card tone="muted">
          <View style={[styles.composerTitle, isRTL && styles.rowReverse]}>
            <View
              style={[
                styles.composerTitleIcon,
                { borderColor: palette.border },
              ]}
            >
              <Send color={colors.primary} size={17} />
            </View>
            <View style={styles.grow}>
              <Text style={text.strong}>{t("conversation.composerTitle")}</Text>
              <Text style={text.body}>{t("conversation.composerHint")}</Text>
            </View>
          </View>
          {attachment ? (
            <View
              style={[
                styles.attachmentRow,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                isRTL && styles.rowReverse,
              ]}
            >
              <Text style={text.body}>{attachment.name}</Text>
              <Pressable onPress={() => setAttachment(null)}>
                <Text style={styles.file}>{t("conversation.removeFile")}</Text>
              </Pressable>
            </View>
          ) : null}
          <View
            style={[
              styles.composer,
              {
                backgroundColor: palette.input,
                borderColor: palette.border,
              },
              isRTL && styles.rowReverse,
            ]}
          >
            <Pressable
              accessibilityLabel={t("conversation.attachFile")}
              accessibilityRole="button"
              disabled={sendMutation.isPending}
              hitSlop={8}
              onPress={pickAttachment}
              style={({ pressed }) => [
                styles.composerIconButton,
                pressed && styles.pressed,
              ]}
            >
              <Paperclip color={colors.primary} size={20} />
            </Pressable>
            <Pressable style={styles.composerInputShell}>
              <TextInput
                accessibilityLabel={t("conversation.message")}
                multiline
                onChangeText={setContent}
                placeholder={t("conversation.messagePlaceholder")}
                placeholderTextColor={palette.placeholder}
                style={[
                  styles.composerInput,
                  {
                    color: palette.text,
                    fontFamily: language === "ar" ? fonts.arabic : fonts.body,
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: direction,
                  },
                ]}
                value={content}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={t("conversation.send")}
              accessibilityRole="button"
              disabled={
                sendMutation.isPending ||
                (content.trim().length === 0 && !attachment)
              }
              onPress={() => sendMutation.mutate()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  opacity:
                    content.trim().length === 0 && !attachment ? 0.48 : 1,
                },
                pressed && styles.pressed,
              ]}
            >
              <Send color="#ffffff" size={18} />
            </Pressable>
          </View>
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  attachmentRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
  },
  composer: {
    alignItems: "flex-end",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  composerIconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  composerInput: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 128,
    minHeight: 42,
    paddingBottom: 9,
    paddingHorizontal: 2,
    paddingTop: 9,
  },
  composerInputShell: {
    flex: 1,
  },
  composerTitleIcon: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
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
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    maxWidth: "86%",
    padding: 14,
  },
  messageBubbleMine: {
    borderBottomEndRadius: 6,
  },
  messageBubbleOther: {
    borderBottomStartRadius: 6,
  },
  messageSenderMine: {
    color: colors.primaryDark,
  },
  messageText: {
    fontSize: 15,
  },
  messageTextMine: {
    color: colors.text,
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
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  time: {
    fontSize: 12,
  },
});

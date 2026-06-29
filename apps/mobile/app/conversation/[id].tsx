import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  MessageCircle,
  Paperclip,
  Send,
} from "lucide-react-native";
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
import { displayLabel, formatDateTime, formatTime } from "../../src/lib/format";
import { usePreferences, useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";
import type { UserRole } from "../../src/types";

export default function ConversationScreen() {
  const { id, name, role } = useLocalSearchParams<{
    id: string;
    name?: string;
    role?: UserRole;
  }>();
  const router = useRouter();
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
        subtitle={
          typeof role === "string"
            ? t(`roles.${role}`)
            : t("conversation.secureThread")
        }
        title={displayLabel(counterpartLabel, language)}
      >
        {messagesQuery.isLoading && !messagesQuery.data ? (
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

        <Card tone="muted">
          <View style={[styles.conversationHeader, isRTL && styles.rowReverse]}>
            <Pressable
              accessibilityLabel={t("shifts.back")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                { borderColor: palette.border },
                pressed && styles.pressed,
              ]}
            >
              {isRTL ? (
                <ArrowRight color={palette.text} size={18} />
              ) : (
                <ArrowLeft color={palette.text} size={18} />
              )}
            </Pressable>
            <Avatar label={counterpartLabel} size={46} />
            <View style={styles.grow}>
              <Text style={text.h2}>
                {displayLabel(counterpartLabel, language)}
              </Text>
              <Text style={text.body}>
                {typeof role === "string"
                  ? t(`roles.${role}`)
                  : t("conversation.secureThread")}
              </Text>
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
                  <View
                    style={[
                      styles.datePill,
                      { backgroundColor: palette.surfaceMuted },
                    ]}
                  >
                    <Text
                      style={[styles.datePillText, { color: palette.muted }]}
                    >
                      {formatDateTime(message.createdAt, language)}
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
                          ? "#6E4676"
                          : isMine
                            ? colors.primarySoft
                            : theme === "dark"
                              ? "#30203B"
                              : palette.surface,
                      borderColor: isMine
                        ? "rgba(255,255,255,0.16)"
                        : palette.border,
                    },
                  ]}
                >
                  <View
                    style={[styles.messageHeader, isRTL && styles.rowReverse]}
                  >
                    <Text
                      style={[
                        text.strong,
                        isMine &&
                          (theme === "dark"
                            ? styles.messageSenderMineDark
                            : styles.messageSenderMineLight),
                      ]}
                    >
                      {isMine
                        ? t("conversation.you")
                        : message.senderRole === "admin"
                          ? displayLabel("Platform Admin", language)
                          : t(`roles.${message.senderRole}`)}
                    </Text>
                    <Text
                      style={[
                        styles.time,
                        {
                          color:
                            isMine && theme === "dark"
                              ? "#F2EAF5"
                              : palette.muted,
                        },
                      ]}
                    >
                      {formatTime(message.createdAt, language)}
                    </Text>
                  </View>
                  {message.content ? (
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color:
                            isMine && theme === "dark"
                              ? "#ffffff"
                              : isMine
                                ? colors.text
                                : palette.text,
                          fontFamily:
                            language === "ar" ? fonts.arabic : fonts.body,
                          textAlign: isRTL ? "right" : "left",
                          writingDirection: direction,
                        },
                      ]}
                    >
                      {displayLabel(message.content, language)}
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
                      <FileText
                        color={
                          isMine && theme === "dark"
                            ? "#ffffff"
                            : colors.primaryDark
                        }
                        size={16}
                      />
                      <Text
                        style={[
                          styles.file,
                          isMine && theme === "dark" && styles.fileMine,
                        ]}
                      >
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
            icon={<MessageCircle color={colors.primary} size={26} />}
          />
        )}

        <View
          style={[
            styles.composerPanel,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border,
            },
          ]}
        >
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
              <Text style={text.body}>
                {displayLabel(attachment.name, language)}
              </Text>
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
        </View>
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
    borderRadius: 22,
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
  backButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  composerPanel: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  file: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  fileMine: {
    color: "#ffffff",
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
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleMine: {
    borderBottomEndRadius: 6,
  },
  messageBubbleOther: {
    borderBottomStartRadius: 6,
  },
  messageSenderMineDark: {
    color: "#ffffff",
  },
  messageSenderMineLight: {
    color: colors.primaryDark,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  conversationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  datePill: {
    alignSelf: "center",
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

import { useMutation, useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Film,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  PlayCircle,
  Send,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
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
  useKeyboardAwareInput,
  useTextStyles,
  useThemePalette,
} from "../../src/components/ui";
import {
  getChatMediaAccessUrl,
  listMessages,
  sendMessageWithAttachment,
  uploadChatMedia,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { displayLabel, formatDateTime, formatTime } from "../../src/lib/format";
import {
  hapticError,
  hapticSelection,
  hapticSuccess,
} from "../../src/lib/haptics";
import { usePreferences, useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";
import type { UserRole } from "../../src/types";

type ConversationMessage = Awaited<
  ReturnType<typeof listMessages>
>["items"][number];

function isImageAttachment(asset: DocumentPicker.DocumentPickerAsset) {
  return asset.mimeType?.startsWith("image/") ?? false;
}

function isPdfAttachment(asset: DocumentPicker.DocumentPickerAsset) {
  return (
    asset.mimeType === "application/pdf" ||
    asset.name.toLowerCase().endsWith(".pdf")
  );
}

function isVideoAttachment(asset: DocumentPicker.DocumentPickerAsset) {
  return asset.mimeType?.startsWith("video/") ?? false;
}

function isImageFile(fileType?: null | string, fileName?: null | string) {
  return (
    fileType?.startsWith("image/") ||
    /\.(gif|jpe?g|png|webp)$/i.test(fileName ?? "")
  );
}

function isVideoFile(fileType?: null | string, fileName?: null | string) {
  return (
    fileType?.startsWith("video/") ||
    /\.(mov|mp4|m4v|webm)$/i.test(fileName ?? "")
  );
}

function formatAttachmentSize(size?: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const listRef = useRef<FlatList<ConversationMessage> | null>(null);
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
  const latestMessageId = messages[messages.length - 1]?.id;

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (latestMessageId) {
      scrollToBottom(false);
    }
  }, [latestMessageId, scrollToBottom]);

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
    onError: () => hapticError(),
    onSuccess: async () => {
      setContent("");
      setAttachment(null);
      await queryClient.invalidateQueries({ queryKey: ["conversation", id] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      hapticSuccess();
    },
  });
  const accessMutation = useMutation({
    mutationFn: (fileUrl: string) => getChatMediaAccessUrl(id, fileUrl),
    onError: () => hapticError(),
    onSuccess: async (result) => {
      hapticSelection();
      await Linking.openURL(result.signedUrl);
    },
  });

  const pickAttachment = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*", "video/*"],
    });

    if (!picked.canceled && picked.assets[0]) {
      setAttachment(picked.assets[0]);
      hapticSelection();
    }
  };

  const renderMessage = ({
    index,
    item: message,
  }: ListRenderItemInfo<ConversationMessage>) => {
    const isMine = isOwnMessage(message);
    const previous = messages[index - 1];
    const currentDate = new Date(message.createdAt).toDateString();
    const previousDate = previous
      ? new Date(previous.createdAt).toDateString()
      : "";
    const showDate = currentDate !== previousDate;

    return (
      <View style={styles.messageGroup}>
        {showDate ? (
          <View
            style={[styles.datePill, { backgroundColor: palette.surfaceMuted }]}
          >
            <Text style={[styles.datePillText, { color: palette.muted }]}>
              {formatDateTime(message.createdAt, language)}
            </Text>
          </View>
        ) : null}
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
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
              borderColor: isMine ? "rgba(255,255,255,0.16)" : palette.border,
            },
          ]}
        >
          <View style={[styles.messageHeader, isRTL && styles.rowReverse]}>
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
                  color: isMine && theme === "dark" ? "#F2EAF5" : palette.muted,
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
                  fontFamily: language === "ar" ? fonts.arabic : fonts.body,
                  textAlign: isRTL ? "right" : "left",
                  writingDirection: direction,
                },
              ]}
            >
              {displayLabel(message.content, language)}
            </Text>
          ) : null}
          {message.fileName ? (
            <MessageAttachmentPreview
              conversationId={id}
              direction={direction}
              fileName={message.fileName}
              fileSize={message.fileSize}
              fileType={message.fileType}
              fileUrl={message.fileUrl}
              isMine={isMine}
              language={language}
              onOpen={() =>
                message.fileUrl ? accessMutation.mutate(message.fileUrl) : null
              }
              palette={palette}
              theme={theme}
            />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        onRefresh={() => void messagesQuery.refetch()}
        refreshing={messagesQuery.isFetching}
        showHeader={false}
        subtitle={
          typeof role === "string"
            ? t(`roles.${role}`)
            : t("conversation.secureThread")
        }
        title={displayLabel(counterpartLabel, language)}
        scrollable={false}
      >
        <View style={styles.chatShell}>
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
            <View
              style={[styles.conversationHeader, isRTL && styles.rowReverse]}
            >
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

          <FlatList
            ref={listRef}
            contentContainerStyle={[
              styles.messageListContent,
              messages.length === 0 && styles.messageListEmpty,
            ]}
            data={messages}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(message) => message.id}
            ListEmptyComponent={
              messagesQuery.isLoading && !messagesQuery.data ? (
                <LoadingBlock label={t("conversation.loading")} />
              ) : (
                <EmptyState
                  body={t("conversation.emptyBody")}
                  icon={<MessageCircle color={colors.primary} size={26} />}
                  title={t("conversation.emptyTitle")}
                />
              )
            }
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            onRefresh={() => void messagesQuery.refetch()}
            refreshing={messagesQuery.isFetching}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            style={styles.messageList}
          />

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
              <AttachmentPreview
                attachment={attachment}
                direction={direction}
                language={language}
                onRemove={() => setAttachment(null)}
                palette={palette}
              />
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
                onPress={() => {
                  hapticSelection();
                  void pickAttachment();
                }}
                style={({ pressed }) => [
                  styles.composerIconButton,
                  pressed && styles.pressed,
                ]}
              >
                <Paperclip color={colors.primary} size={20} />
              </Pressable>
              <Pressable style={styles.composerInputShell}>
                <ComposerTextInput
                  content={content}
                  direction={direction}
                  isRTL={isRTL}
                  language={language}
                  onChangeText={setContent}
                  palette={palette}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={t("conversation.send")}
                accessibilityRole="button"
                disabled={
                  sendMutation.isPending ||
                  (content.trim().length === 0 && !attachment)
                }
                onPress={() => {
                  hapticSelection();
                  sendMutation.mutate();
                }}
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
        </View>
      </Screen>
    </>
  );
}

function ComposerTextInput({
  content,
  direction,
  isRTL,
  language,
  onChangeText,
  palette,
}: {
  content: string;
  direction: "ltr" | "rtl";
  isRTL: boolean;
  language: "ar" | "en";
  onChangeText: (value: string) => void;
  palette: ReturnType<typeof useThemePalette>;
}) {
  const t = useT();
  const { ensureInputVisible } = useKeyboardAwareInput();

  return (
    <TextInput
      accessibilityLabel={t("conversation.message")}
      multiline
      onChangeText={onChangeText}
      onFocus={(event) => ensureInputVisible(event.nativeEvent.target)}
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
  );
}

function AttachmentPreview({
  attachment,
  direction,
  language,
  onRemove,
  palette,
}: {
  attachment: DocumentPicker.DocumentPickerAsset;
  direction: "ltr" | "rtl";
  language: "ar" | "en";
  onRemove: () => void;
  palette: ReturnType<typeof useThemePalette>;
}) {
  const t = useT();
  const isRTL = direction === "rtl";
  const isImage = isImageAttachment(attachment);
  const isPdf = isPdfAttachment(attachment);
  const isVideo = isVideoAttachment(attachment);
  const fileSize = formatAttachmentSize(attachment.size);
  const typeLabel = isImage
    ? t("conversation.imagePreview")
    : isVideo
      ? t("conversation.videoPreview")
      : isPdf
        ? t("conversation.pdfPreview")
        : t("conversation.filePreview");

  return (
    <View
      style={[
        styles.attachmentPreview,
        { backgroundColor: palette.surface, borderColor: palette.border },
        isRTL && styles.rowReverse,
      ]}
    >
      {isImage ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: attachment.uri }}
          style={styles.attachmentImage}
        />
      ) : isVideo ? (
        <View style={styles.attachmentVideoPreview}>
          <PlayCircle color="#ffffff" size={30} />
        </View>
      ) : (
        <View
          style={[
            styles.attachmentIconPreview,
            { backgroundColor: palette.surfaceMuted },
          ]}
        >
          {isPdf ? (
            <FileText color={colors.primary} size={24} />
          ) : (
            <ImageIcon color={colors.primary} size={24} />
          )}
        </View>
      )}
      <View style={styles.attachmentMeta}>
        <Text
          numberOfLines={1}
          style={[
            styles.attachmentName,
            {
              color: palette.text,
              fontFamily: language === "ar" ? fonts.arabicBold : fonts.bodyBold,
              textAlign: isRTL ? "right" : "left",
              writingDirection: direction,
            },
          ]}
        >
          {displayLabel(attachment.name, language)}
        </Text>
        <Text
          style={[
            styles.attachmentType,
            {
              color: palette.muted,
              fontFamily: language === "ar" ? fonts.arabic : fonts.body,
              textAlign: isRTL ? "right" : "left",
              writingDirection: direction,
            },
          ]}
        >
          {fileSize ? `${typeLabel} · ${fileSize}` : typeLabel}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={t("conversation.removeFile")}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeAttachmentButton,
          { borderColor: palette.border },
          pressed && styles.pressed,
        ]}
      >
        <X color={palette.text} size={18} />
      </Pressable>
    </View>
  );
}

function MessageAttachmentPreview({
  conversationId,
  direction,
  fileName,
  fileSize,
  fileType,
  fileUrl,
  isMine,
  language,
  onOpen,
  palette,
  theme,
}: {
  conversationId: string;
  direction: "ltr" | "rtl";
  fileName: string;
  fileSize?: null | number;
  fileType?: null | string;
  fileUrl?: null | string;
  isMine: boolean;
  language: "ar" | "en";
  onOpen: () => void;
  palette: ReturnType<typeof useThemePalette>;
  theme: "dark" | "light";
}) {
  const t = useT();
  const isRTL = direction === "rtl";
  const isImage = isImageFile(fileType, fileName);
  const isVideo = isVideoFile(fileType, fileName);
  const accessQuery = useQuery({
    enabled: Boolean(fileUrl && (isImage || isVideo)),
    queryFn: () => getChatMediaAccessUrl(conversationId, fileUrl as string),
    queryKey: ["chat-media-preview", conversationId, fileUrl],
    staleTime: 4 * 60 * 1000,
  });
  const signedUrl = accessQuery.data?.signedUrl;
  const fileColor = isMine && theme === "dark" ? "#ffffff" : colors.primaryDark;
  const metaColor = isMine && theme === "dark" ? "#F2EAF5" : palette.muted;
  const fileSizeLabel = formatAttachmentSize(fileSize);
  const typeLabel = isImage
    ? t("conversation.imageAttachment")
    : isVideo
      ? t("conversation.videoAttachment")
      : t("conversation.fileAttachment");

  if (isImage && signedUrl) {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.mediaPreview,
          pressed && styles.pressed,
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={{ uri: signedUrl }}
          style={styles.messageImage}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!fileUrl}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.mediaCard,
        {
          backgroundColor:
            isMine && theme === "dark"
              ? "rgba(255,255,255,0.12)"
              : palette.surfaceMuted,
          borderColor: isMine ? "rgba(255,255,255,0.16)" : palette.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.mediaHero,
          {
            backgroundColor: isVideo
              ? "rgba(102,60,109,0.88)"
              : "rgba(86,132,154,0.14)",
          },
        ]}
      >
        {isVideo ? (
          <PlayCircle color="#ffffff" size={38} />
        ) : isImage ? (
          <ImageIcon color={fileColor} size={34} />
        ) : (
          <FileText color={fileColor} size={34} />
        )}
      </View>
      <View style={[styles.mediaMeta, isRTL && styles.rowReverse]}>
        {isVideo ? (
          <Film color={fileColor} size={16} />
        ) : isImage ? (
          <ImageIcon color={fileColor} size={16} />
        ) : (
          <FileText color={fileColor} size={16} />
        )}
        <View style={styles.mediaMetaText}>
          <Text
            numberOfLines={1}
            style={[
              styles.file,
              { color: fileColor },
              language === "ar" && { fontFamily: fonts.arabicBold },
            ]}
          >
            {displayLabel(fileName, language)}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.mediaType,
              {
                color: metaColor,
                textAlign: isRTL ? "right" : "left",
                writingDirection: direction,
              },
            ]}
          >
            {fileSizeLabel ? `${typeLabel} · ${fileSizeLabel}` : typeLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  attachmentIconPreview: {
    alignItems: "center",
    borderRadius: 16,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  attachmentImage: {
    backgroundColor: colors.panelSoft,
    borderRadius: 16,
    height: 78,
    width: 78,
  },
  attachmentMeta: {
    flex: 1,
    gap: 3,
  },
  attachmentName: {
    fontSize: 15,
  },
  attachmentPreview: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  attachmentVideoPreview: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  attachmentType: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatShell: {
    flex: 1,
    gap: 10,
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
  removeAttachmentButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
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
  messageList: {
    flex: 1,
  },
  messageListContent: {
    gap: 12,
    paddingBottom: 8,
    paddingTop: 4,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  mediaCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    overflow: "hidden",
    width: 244,
  },
  mediaHero: {
    alignItems: "center",
    height: 132,
    justifyContent: "center",
    width: "100%",
  },
  mediaMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  mediaMetaText: {
    flex: 1,
    gap: 2,
  },
  mediaPreview: {
    borderRadius: 16,
    overflow: "hidden",
  },
  mediaType: {
    fontSize: 12,
    fontWeight: "700",
  },
  messageImage: {
    backgroundColor: colors.panelSoft,
    borderRadius: 16,
    height: 172,
    width: 244,
  },
});

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Send,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  Check,
  CheckCheck,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  FileSpreadsheet,
  File as FileIcon,
  Volume2,
  Trash2,
  MoreVertical,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ChatMediaUpload } from "./ChatMediaUpload";
import { ChatMediaGallery } from "./ChatMediaGallery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { resolveMediaUrl } from "@/lib/storage";
import { VerificationBadge } from "@/components/ui/verification-badge";
import type { Database } from "@/integrations/backend/types";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  file_size?: number | null;
}

interface ConversationDetails {
  id: string;
  kind: "standard" | "admin";
  otherName: string;
  otherAvatar: string | null;
  otherType: "professional" | "clinic" | "admin";
  otherVerificationStatus?: "pending" | "verified" | "rejected" | null;
}

type AdminMessageRow = Database["public"]["Tables"]["admin_messages"]["Row"];

const normalizeAdminMessage = (message: AdminMessageRow): Message => ({
  id: message.id,
  conversation_id: message.admin_conversation_id,
  sender_id: message.sender_user_id,
  sender_type: message.sender_role,
  content: message.content,
  is_read: message.is_read ?? false,
  created_at: message.created_at,
  file_url: message.file_url,
  file_type: message.file_type,
  file_name: message.file_name,
  file_size: message.file_size,
});

interface ChatMessagesProps {
  conversationId: string;
  userType: "professional" | "clinic" | "admin";
  profileId: string;
  currentUserId: string;
  onBack?: () => void;
}

const renderMessageContent = (content: string, isOwn: boolean) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all ${isOwn ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"}`}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const getFileIcon = (fileName?: string | null) => {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-5 w-5 text-destructive" />;
  if (ext === "doc" || ext === "docx")
    return <FileText className="h-5 w-5 text-sky" />;
  if (ext === "xls" || ext === "xlsx")
    return <FileSpreadsheet className="h-5 w-5 text-success" />;
  return <FileIcon className="h-5 w-5" />;
};

export const ChatMessages = ({
  conversationId,
  userType,
  profileId,
  currentUserId,
  onBack,
}: ChatMessagesProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ConversationDetails | null>(
    null,
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deleteConversationOpen, setDeleteConversationOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationKind, rawConversationId] = conversationId.includes(":")
    ? (conversationId.split(":", 2) as ["standard" | "admin", string])
    : (["standard", conversationId] as const);

  const allImages = useMemo(
    () =>
      messages
        .filter((m) => m.file_type?.startsWith("image/") && m.file_url)
        .map((m) => resolveMediaUrl(m.file_url!) ?? m.file_url!),
    [messages],
  );
  const currentImageIndex = previewImage ? allImages.indexOf(previewImage) : -1;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 100);
  }, []);

  const safeDate = (value?: string | null) => {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoadError(null);

      if (conversationKind === "admin") {
        const { data, error } = await backendDb
          .from("admin_messages")
          .select("*")
          .eq("admin_conversation_id", rawConversationId)
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        setMessages(
          (data || []).map((message) =>
            "admin_conversation_id" in message
              ? normalizeAdminMessage(message as AdminMessageRow)
              : (message as Message),
          ),
        );
        setLoading(false);

        await backendDb
          .from("admin_messages")
          .update({ is_read: true })
          .eq("admin_conversation_id", rawConversationId)
          .neq("sender_user_id", currentUserId)
          .eq("is_read", false);

        scrollToBottom("auto");
        return;
      }

      const { data, error } = await backendDb
        .from("messages")
        .select("*")
        .eq("conversation_id", rawConversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setMessages(data || []);
      setLoading(false);

      await backendDb
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", rawConversationId)
        .neq("sender_type", userType)
        .eq("is_read", false);

      scrollToBottom("auto");
    } catch (error) {
      console.error("Unable to load messages", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : t("chat.loadMessagesError", "Could not load messages"),
      );
      setMessages([]);
      setLoading(false);
    }
  }, [
    conversationKind,
    currentUserId,
    rawConversationId,
    scrollToBottom,
    t,
    userType,
  ]);

  useEffect(() => {
    const fetchConversation = async () => {
      if (conversationKind === "admin") {
        const { data: convData, error } = await backendDb
          .from("admin_conversations")
          .select(
            "id, admin_display_name, admin_email, target_type, target_profile_id, target_clinic_id",
          )
          .eq("id", rawConversationId)
          .single();

        if (error || !convData) return;

        const fallbackConversation: ConversationDetails = {
          id: convData.id,
          kind: "admin",
          otherName:
            convData.display_name ||
            convData.admin_display_name ||
            convData.admin_email ||
            t("chat.adminSupport"),
          otherAvatar: null,
          otherType:
            convData.counterpart_role === "clinic"
              ? "clinic"
              : convData.counterpart_role === "professional"
                ? "professional"
                : "admin",
          otherVerificationStatus: null,
        };

        if (userType === "admin") {
          if (
            convData.target_type === "professional" &&
            convData.target_profile_id
          ) {
            const { data: professional } = await backendDb
              .from("profiles")
              .select("full_name, avatar_url, verification_status")
              .eq("id", convData.target_profile_id)
              .single();

            setConversation({
              id: convData.id,
              kind: "admin",
              otherName: professional?.full_name ?? t("chat.professional"),
              otherAvatar: professional?.avatar_url ?? null,
              otherType: "professional",
              otherVerificationStatus:
                professional?.verification_status ?? null,
            });
            return;
          }

          if (!convData.target_clinic_id) {
            setConversation(fallbackConversation);
            return;
          }

          const { data: clinic } = await backendDb
            .from("clinics")
            .select("name, logo_url, verification_status")
            .eq("id", convData.target_clinic_id)
            .single();

          setConversation({
            id: convData.id,
            kind: "admin",
            otherName: clinic?.name ?? t("chat.clinic"),
            otherAvatar: clinic?.logo_url ?? null,
            otherType: "clinic",
            otherVerificationStatus: clinic?.verification_status ?? null,
          });
          return;
        }

        if (convData.display_name && !convData.admin_display_name) {
          setConversation(fallbackConversation);
          return;
        }

        setConversation({
          id: convData.id,
          kind: "admin",
          otherName:
            convData.admin_display_name ||
            convData.admin_email ||
            t("chat.adminSupport"),
          otherAvatar: null,
          otherType: "admin",
          otherVerificationStatus: null,
        });
        return;
      }

      const { data: convData, error } = await backendDb
        .from("conversations")
        .select("id, professional_id, clinic_id")
        .eq("id", rawConversationId)
        .single();
      if (error || !convData) return;
      if (!convData.professional_id || !convData.clinic_id) {
        setConversation({
          id: convData.id,
          kind: "standard",
          otherName:
            convData.display_name ||
            (convData.counterpart_role === "clinic"
              ? t("chat.clinic")
              : t("chat.professional")),
          otherAvatar: null,
          otherType:
            convData.counterpart_role === "clinic" ? "clinic" : "professional",
          otherVerificationStatus: null,
        });
        return;
      }

      const { data: professional } = await backendDb
        .from("profiles")
        .select("id, full_name, avatar_url, verification_status")
        .eq("id", convData.professional_id)
        .single();
      const { data: clinic } = await backendDb
        .from("clinics")
        .select("id, name, logo_url, verification_status")
        .eq("id", convData.clinic_id)
        .single();

      const isViewerProfessional = userType === "professional";

      setConversation({
        id: convData.id,
        kind: "standard",
        otherName: isViewerProfessional
          ? (clinic?.name ?? t("chat.clinic"))
          : (professional?.full_name ?? t("chat.professional")),
        otherAvatar: isViewerProfessional
          ? (clinic?.logo_url ?? null)
          : (professional?.avatar_url ?? null),
        otherType: isViewerProfessional ? "clinic" : "professional",
        otherVerificationStatus: isViewerProfessional
          ? (clinic?.verification_status ?? null)
          : (professional?.verification_status ?? null),
      });
    };

    void fetchConversation();
    void fetchMessages();

    const pollIntervalId = window.setInterval(() => {
      void fetchMessages();
    }, 5000);

    return () => {
      window.clearInterval(pollIntervalId);
    };
  }, [conversationKind, fetchMessages, rawConversationId, t, userType]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingMedia) || sending) return;
    setSending(true);

    try {
      if (conversationKind === "admin") {
        const messageData: Database["public"]["Tables"]["admin_messages"]["Insert"] =
          {
            admin_conversation_id: rawConversationId,
            sender_user_id: currentUserId,
            sender_role: userRole === "super_admin" ? "super_admin" : userType,
            content:
              newMessage.trim() ||
              (pendingMedia ? `📎 ${pendingMedia.name}` : ""),
          };
        if (pendingMedia) {
          messageData.file_url = pendingMedia.url;
          messageData.file_type = pendingMedia.type;
          messageData.file_name = pendingMedia.name;
          messageData.file_size = pendingMedia.size;
        }

        const { error } = await backendDb
          .from("admin_messages")
          .insert(messageData);
        if (error) throw error;
        await backendDb
          .from("admin_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", rawConversationId);
      } else {
        const messageData: Database["public"]["Tables"]["messages"]["Insert"] =
          {
            conversation_id: rawConversationId,
            sender_id: profileId,
            sender_type: userType,
            content:
              newMessage.trim() ||
              (pendingMedia ? `📎 ${pendingMedia.name}` : ""),
          };
        if (pendingMedia) {
          messageData.file_url = pendingMedia.url;
          messageData.file_type = pendingMedia.type;
          messageData.file_name = pendingMedia.name;
          messageData.file_size = pendingMedia.size;
        }
        const { error } = await backendDb.from("messages").insert(messageData);
        if (error) throw error;
        await backendDb
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", rawConversationId);
      }
      setNewMessage("");
      setPendingMedia(null);
      await fetchMessages();
      scrollToBottom();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("chat.sendError"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return;
    try {
      const { error } = await backendDb
        .from(conversationKind === "admin" ? "admin_messages" : "messages")
        .delete()
        .eq("id", deleteMessageId);
      if (error) throw error;
      await fetchMessages();
      toast({ title: t("chat.messageDeleted") });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setDeleteMessageId(null);
    }
  };

  const handleDeleteConversation = async () => {
    try {
      if (conversationKind === "admin") {
        await backendDb
          .from("admin_messages")
          .delete()
          .eq("admin_conversation_id", rawConversationId);
      } else {
        await backendDb
          .from("messages")
          .delete()
          .eq("conversation_id", rawConversationId);
      }
      const { error } = await backendDb
        .from(
          conversationKind === "admin"
            ? "admin_conversations"
            : "conversations",
        )
        .delete()
        .eq("id", rawConversationId);
      if (error) throw error;
      toast({ title: t("chat.conversationDeleted") });
      onBack?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setDeleteConversationOpen(false);
    }
  };

  const handleMediaUpload = (
    fileUrl: string,
    fileName: string,
    fileType: string,
    fileSize: number,
  ) => {
    setPendingMedia({
      url: fileUrl,
      name: fileName,
      type: fileType,
      size: fileSize,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return t("chat.today");
    if (isYesterday(date)) return t("chat.yesterday");
    return format(date, "MMM d, yyyy", { locale: isRTL ? ar : enUS });
  };

  const otherName = conversation?.otherName;
  const otherAvatar = conversation?.otherAvatar;
  const OtherIcon =
    conversation?.otherType === "clinic"
      ? Building2
      : conversation?.otherType === "admin"
        ? User
        : User;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="border-b p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <Skeleton className="h-16 w-48 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col h-full w-full" dir={isRTL ? "rtl" : "ltr"}>
        <div className="border-b p-3 flex items-center gap-3 bg-background shadow-sm shrink-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={t("chat.goBack")}
              className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0"
            >
              <BackArrow className="h-5 w-5" />
            </Button>
          )}
          <p className="font-medium">{t("chat.messages")}</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="font-medium">
            {t("chat.loadMessagesError", "Could not load messages")}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void fetchMessages()}
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b p-3 flex items-center gap-3 bg-background shadow-sm shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t("chat.goBack")}
            className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0"
          >
            <BackArrow className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherAvatar || undefined} alt={otherName || ""} />
          <AvatarFallback>
            <OtherIcon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium truncate">{otherName}</p>
            {conversation?.otherVerificationStatus && (
              <VerificationBadge
                status={conversation.otherVerificationStatus}
                size="sm"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {conversation?.otherType === "admin"
              ? t("chat.adminSupport")
              : userType === "professional"
                ? t("chat.clinic")
                : t("chat.professional")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setGalleryOpen(true)}
          className="h-10 w-10 shrink-0"
          aria-label={t("chat.mediaAndFiles")}
        >
          <Grid3X3 className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setDeleteConversationOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t("chat.deleteConversation")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("chat.startConversation")}
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sender_type === userType;
              const hasImage = msg.file_type?.startsWith("image/");
              const hasVideo = msg.file_type?.startsWith("video/");
              const hasAudio = msg.file_type?.startsWith("audio/");
              const hasFile =
                msg.file_url && !hasImage && !hasVideo && !hasAudio;
              const msgDate = safeDate(msg.created_at);
              const prevDate =
                idx > 0 ? safeDate(messages[idx - 1].created_at) : null;
              const showDateSeparator =
                Boolean(msgDate) &&
                (!prevDate || !isSameDay(msgDate, prevDate));

              return (
                <div key={msg.id}>
                  {showDateSeparator && msgDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground bg-background px-2 font-medium">
                        {getDateLabel(msgDate)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 relative ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}
                    >
                      {/* Delete button for own messages */}
                      {isOwn && (
                        <button
                          onClick={() => setDeleteMessageId(msg.id)}
                          className="absolute -top-2 -start-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-1 h-6 w-6 flex items-center justify-center shadow-sm"
                          aria-label={t("chat.deleteMessage")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}

                      {hasImage && msg.file_url && (
                        <button
                          onClick={() =>
                            setPreviewImage(
                              resolveMediaUrl(msg.file_url!) ?? msg.file_url!,
                            )
                          }
                          className="block mb-2 rounded-xl overflow-hidden hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <img
                            src={
                              resolveMediaUrl(msg.file_url!) ?? msg.file_url!
                            }
                            alt={msg.file_name || "Image"}
                            className="max-w-full max-h-64 object-cover rounded-xl"
                            loading="lazy"
                          />
                        </button>
                      )}

                      {hasVideo && msg.file_url && (
                        <div className="mb-2 rounded-xl overflow-hidden shadow-sm">
                          <video
                            controls
                            preload="metadata"
                            className="max-w-full max-h-64 rounded-xl w-full"
                          >
                            <source
                              src={
                                resolveMediaUrl(msg.file_url!) ?? msg.file_url!
                              }
                              type={msg.file_type || "video/mp4"}
                            />
                          </video>
                        </div>
                      )}

                      {hasAudio && msg.file_url && (
                        <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-background/10">
                          <Volume2 className="h-5 w-5 shrink-0 opacity-70" />
                          <audio
                            controls
                            preload="metadata"
                            className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent"
                          >
                            <source
                              src={
                                resolveMediaUrl(msg.file_url!) ?? msg.file_url!
                              }
                              type={msg.file_type || "audio/mpeg"}
                            />
                          </audio>
                        </div>
                      )}

                      {hasFile && (
                        <a
                          href={resolveMediaUrl(msg.file_url!) ?? msg.file_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2.5 rounded-lg mb-2 ${isOwn ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"} transition-colors`}
                        >
                          {getFileIcon(msg.file_name)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {msg.file_name}
                            </p>
                            {msg.file_size && (
                              <p className="text-xs opacity-70">
                                {formatFileSize(msg.file_size)}
                              </p>
                            )}
                          </div>
                          <Download className="h-4 w-4 shrink-0 opacity-70" />
                        </a>
                      )}

                      {msg.content && !msg.content.startsWith("📎") && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {renderMessageContent(msg.content, isOwn)}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p
                          className={`text-[11px] ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}
                        >
                          {msgDate
                            ? format(msgDate, "HH:mm", {
                                locale: isRTL ? ar : enUS,
                              })
                            : ""}
                        </p>
                        {isOwn &&
                          (msg.is_read ? (
                            <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/60" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-primary-foreground/60" />
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 bg-background pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 shrink-0">
        {pendingMedia && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg">
            {pendingMedia.type.startsWith("image/") ? (
              <img
                src={pendingMedia.url}
                alt={pendingMedia.name}
                className="h-12 w-12 object-cover rounded"
              />
            ) : (
              <div className="h-12 w-12 bg-background rounded flex items-center justify-center">
                {getFileIcon(pendingMedia.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {pendingMedia.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(pendingMedia.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingMedia(null)}
            >
              ✕
            </Button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <ChatMediaUpload
            conversationId={conversationId}
            onUploadComplete={handleMediaUpload}
            disabled={sending}
          />
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.typePlaceholder")}
            className="min-h-[48px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !pendingMedia) || sending}
            size="icon"
            aria-label={t("chat.sendMessage")}
            className="h-12 w-12 min-h-[48px] min-w-[48px] shrink-0"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">
            {t("chat.imagePreview")}
          </DialogTitle>
          <div className="relative flex items-center justify-center min-h-[50vh]">
            {allImages.length > 1 && currentImageIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute start-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white h-10 w-10"
                onClick={() =>
                  setPreviewImage(allImages[currentImageIndex - 1])
                }
                aria-label={t("common.previous")}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {allImages.length > 1 &&
              currentImageIndex < allImages.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white h-10 w-10"
                  onClick={() =>
                    setPreviewImage(allImages[currentImageIndex + 1])
                  }
                  aria-label={t("common.next")}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            <div className="absolute top-2 end-2 z-10 flex items-center gap-2">
              {allImages.length > 1 && (
                <span className="text-white/80 text-sm bg-black/50 px-2 py-1 rounded">
                  {currentImageIndex + 1} / {allImages.length}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white h-9 w-9"
                asChild
              >
                <a
                  href={previewImage || ""}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("chat.downloadFile")}
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain touch-pinch-zoom"
                style={{ touchAction: "pinch-zoom" }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Gallery */}
      <ChatMediaGallery
        conversationId={conversationId}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      {/* Delete Message Confirm */}
      <AlertDialog
        open={!!deleteMessageId}
        onOpenChange={(open) => !open && setDeleteMessageId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.deleteMessageTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteMessageDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Conversation Confirm */}
      <AlertDialog
        open={deleteConversationOpen}
        onOpenChange={setDeleteConversationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("chat.deleteConversationTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteConversationDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle,
  Building2,
  User,
  Shield,
  ImageIcon,
  Paperclip,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  kind: "standard" | "admin";
  last_message_at: string;
  display_name: string;
  avatar_url: string | null;
  counterpart_type: "professional" | "clinic" | "admin";
  counterpart_verification_status?: "pending" | "verified" | "rejected" | null;
  unread_count?: number;
  last_message?: string;
  last_file_type?: string | null;
}

interface ChatListProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  userType: "professional" | "clinic" | "admin";
  profileId: string;
  currentUserId: string;
}

export const ChatList = ({
  selectedConversation,
  onSelectConversation,
  userType,
  profileId,
  currentUserId,
}: ChatListProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: isRTL ? ar : enUS,
    });
  };

  const formatAbsoluteTime = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(isRTL ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const fetchConversations = useCallback(async () => {
    if (!user || !profileId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoadError(null);

      const standardConversationsPromise =
        userType === "admin"
          ? Promise.resolve({ data: [], error: null } as const)
          : backendDb
              .from("conversations")
              .select("id, professional_id, clinic_id, last_message_at")
              .order("last_message_at", { ascending: false })
              .eq(
                userType === "professional" ? "professional_id" : "clinic_id",
                profileId,
              );

      const adminConversationsPromise =
        userType === "admin"
          ? backendDb
              .from("admin_conversations")
              .select(
                "id, admin_user_id, admin_display_name, admin_email, target_user_id, target_type, target_profile_id, target_clinic_id, last_message_at",
              )
              .eq("admin_user_id", currentUserId)
              .order("last_message_at", { ascending: false })
          : backendDb
              .from("admin_conversations")
              .select(
                "id, admin_user_id, admin_display_name, admin_email, target_user_id, target_type, target_profile_id, target_clinic_id, last_message_at",
              )
              .eq("target_user_id", currentUserId)
              .order("last_message_at", { ascending: false });

      const [
        { data: standardData, error: standardError },
        { data: adminData, error: adminError },
      ] = await Promise.all([
        standardConversationsPromise,
        adminConversationsPromise,
      ]);

      if (standardError) {
        console.error(standardError);
      }
      if (adminError) {
        console.error(adminError);
      }

      const standardItems = await Promise.all(
        (standardData || []).map(async (conv) => {
          if (!conv.professional_id || !conv.clinic_id) {
            return {
              id: `standard:${conv.id}`,
              kind: "standard" as const,
              last_message_at: conv.last_message_at,
              display_name:
                conv.display_name ||
                (conv.counterpart_role === "clinic"
                  ? t("chat.clinic")
                  : t("chat.professional")),
              avatar_url: null,
              counterpart_type:
                conv.counterpart_role === "clinic"
                  ? ("clinic" as const)
                  : ("professional" as const),
              counterpart_verification_status: null,
              unread_count: 0,
              last_message: undefined,
              last_file_type: null,
            };
          }

          const { data: professional } = await backendDb
            .from("profiles")
            .select("id, full_name, avatar_url, verification_status")
            .eq("id", conv.professional_id)
            .single();
          const { data: clinic } = await backendDb
            .from("clinics")
            .select("id, name, logo_url, verification_status")
            .eq("id", conv.clinic_id)
            .single();
          const { count: unreadCount } = await backendDb
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_type", userType);
          const { data: lastMsg } = await backendDb
            .from("messages")
            .select("content, file_type")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const isViewerProfessional = userType === "professional";
          const counterpart = isViewerProfessional ? clinic : professional;

          return {
            id: `standard:${conv.id}`,
            kind: "standard" as const,
            last_message_at: conv.last_message_at,
            display_name: isViewerProfessional
              ? (clinic?.name ?? t("chat.clinic"))
              : (professional?.full_name ?? t("chat.professional")),
            avatar_url: isViewerProfessional
              ? (clinic?.logo_url ?? null)
              : (professional?.avatar_url ?? null),
            counterpart_type: isViewerProfessional ? "clinic" : "professional",
            counterpart_verification_status:
              counterpart?.verification_status ?? null,
            unread_count: unreadCount || 0,
            last_message: lastMsg?.content,
            last_file_type: lastMsg?.file_type,
          };
        }),
      );

      const adminItems = await Promise.all(
        (adminData || []).map(async (conv) => {
          const { count: unreadCount } = await backendDb
            .from("admin_messages")
            .select("*", { count: "exact", head: true })
            .eq("admin_conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_type", userType);
          const { data: lastMsg } = await backendDb
            .from("admin_messages")
            .select("content, file_type")
            .eq("admin_conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const fallbackAdminItem = {
            id: `admin:${conv.id}`,
            kind: "admin" as const,
            last_message_at: conv.last_message_at,
            display_name:
              conv.display_name ||
              conv.admin_display_name ||
              conv.admin_email ||
              t("chat.adminSupport"),
            avatar_url: null,
            counterpart_type:
              conv.counterpart_role === "clinic"
                ? ("clinic" as const)
                : conv.counterpart_role === "professional"
                  ? ("professional" as const)
                  : ("admin" as const),
            counterpart_verification_status: null,
            unread_count: unreadCount || 0,
            last_message: lastMsg?.content,
            last_file_type: lastMsg?.file_type,
          };

          if (userType === "admin") {
            if (conv.target_type === "professional" && conv.target_profile_id) {
              const { data: professional } = await backendDb
                .from("profiles")
                .select("full_name, avatar_url, verification_status")
                .eq("id", conv.target_profile_id)
                .single();

              return {
                id: `admin:${conv.id}`,
                kind: "admin" as const,
                last_message_at: conv.last_message_at,
                display_name: professional?.full_name ?? t("chat.professional"),
                avatar_url: professional?.avatar_url ?? null,
                counterpart_type: "professional" as const,
                counterpart_verification_status:
                  professional?.verification_status ?? null,
                unread_count: unreadCount || 0,
                last_message: lastMsg?.content,
                last_file_type: lastMsg?.file_type,
              };
            }

            if (!conv.target_clinic_id) {
              return fallbackAdminItem;
            }

            const { data: clinic } = await backendDb
              .from("clinics")
              .select("name, logo_url, verification_status")
              .eq("id", conv.target_clinic_id)
              .single();

            return {
              id: `admin:${conv.id}`,
              kind: "admin" as const,
              last_message_at: conv.last_message_at,
              display_name: clinic?.name ?? t("chat.clinic"),
              avatar_url: clinic?.logo_url ?? null,
              counterpart_type: "clinic" as const,
              counterpart_verification_status:
                clinic?.verification_status ?? null,
              unread_count: unreadCount || 0,
              last_message: lastMsg?.content,
              last_file_type: lastMsg?.file_type,
            };
          }

          if (!conv.admin_display_name && conv.display_name) {
            return fallbackAdminItem;
          }

          return {
            id: `admin:${conv.id}`,
            kind: "admin" as const,
            last_message_at: conv.last_message_at,
            display_name:
              conv.admin_display_name ||
              conv.admin_email ||
              t("chat.adminSupport"),
            avatar_url: null,
            counterpart_type: "admin" as const,
            counterpart_verification_status: null,
            unread_count: unreadCount || 0,
            last_message: lastMsg?.content,
            last_file_type: lastMsg?.file_type,
          };
        }),
      );

      setConversations(
        [...standardItems, ...adminItems].sort((a, b) => {
          const bTime = new Date(b.last_message_at ?? 0).getTime();
          const aTime = new Date(a.last_message_at ?? 0).getTime();
          return (
            (Number.isNaN(bTime) ? 0 : bTime) -
            (Number.isNaN(aTime) ? 0 : aTime)
          );
        }),
      );
    } catch (error) {
      console.error("Unable to load conversations", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : t("chat.loadError", "Could not load conversations"),
      );
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, profileId, t, user, userType]);

  useEffect(() => {
    void fetchConversations();

    const intervalId = window.setInterval(() => {
      void fetchConversations();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchConversations]);

  const getLastMessagePreview = (conv: Conversation) => {
    if (conv.last_file_type?.startsWith("image/"))
      return (
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" />
          {t("chat.photo") || "Photo"}
        </span>
      );
    if (conv.last_file_type?.startsWith("video/"))
      return (
        <span className="flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          {t("chat.video") || "Video"}
        </span>
      );
    if (conv.last_file_type?.startsWith("audio/"))
      return (
        <span className="flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          {t("chat.audio") || "Audio"}
        </span>
      );
    if (conv.last_file_type)
      return (
        <span className="flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          {t("chat.file") || "File"}
        </span>
      );
    return conv.last_message || t("chat.noMessages");
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-foreground font-medium">
          {t("chat.loadError", "Could not load conversations")}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {loadError}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void fetchConversations()}
        >
          <RefreshCw className="h-4 w-4 me-2" />
          {t("common.refresh")}
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">
          {t("chat.noConversations")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {userType === "admin"
            ? t("chat.startByAdminAction")
            : t("chat.startByBooking")}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5 p-2">
        {conversations.map((conv) => {
          const Icon =
            conv.counterpart_type === "clinic"
              ? Building2
              : conv.counterpart_type === "admin"
                ? Shield
                : User;

          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-start min-h-[64px] ${
                selectedConversation === conv.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-secondary/50"
              }`}
              dir={isRTL ? "rtl" : "ltr"}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={conv.avatar_url || undefined}
                    alt={conv.display_name || ""}
                  />
                  <AvatarFallback>
                    <Icon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-medium truncate ${(conv.unread_count ?? 0) > 0 ? "font-semibold" : ""}`}
                    >
                      {conv.display_name}
                    </span>
                    {conv.counterpart_verification_status && (
                      <VerificationBadge
                        status={conv.counterpart_verification_status}
                        size="sm"
                      />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    <time
                      dateTime={conv.last_message_at}
                      title={formatAbsoluteTime(conv.last_message_at)}
                    >
                      {formatRelativeTime(conv.last_message_at)}
                    </time>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div
                    className={`text-sm truncate ${(conv.unread_count ?? 0) > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}
                  >
                    {getLastMessagePreview(conv)}
                  </div>
                  {(conv.unread_count ?? 0) > 0 && (
                    <Badge
                      variant="default"
                      className="h-5 min-w-5 flex items-center justify-center text-xs rounded-full px-1.5"
                    >
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

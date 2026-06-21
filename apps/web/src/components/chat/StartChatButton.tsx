import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_CONFIG } from "@/config/backend";
import { getGatewayAuthorizationHeaders } from "@/lib/auth-backend";
import {
  isGatewayBackendConfigured,
  startGatewayConversation,
} from "@/lib/platform-backend";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StartChatButtonProps {
  targetType: "professional" | "clinic";
  targetId: string;
  targetUserId?: string;
  currentProfileId: string;
  currentUserType: "professional" | "clinic" | "admin";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const StartChatButton = ({
  targetType,
  targetId,
  targetUserId,
  currentProfileId,
  currentUserType,
  variant = "outline",
  size = "default",
  className,
}: StartChatButtonProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const startAdminConversation = async (targetSubject: string) => {
    const headers = getGatewayAuthorizationHeaders();

    if (!BACKEND_CONFIG.apiGatewayBaseUrl || !headers) {
      throw new Error(t("chat.startError"));
    }

    const response = await fetch(
      `${BACKEND_CONFIG.apiGatewayBaseUrl}/admin/conversations`,
      {
        method: "POST",
        headers: {
          ...headers,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ targetSubject }),
      },
    );
    const body = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new Error(
        typeof body?.message === "string" ? body.message : t("chat.startError"),
      );
    }

    return body as { id: string; kind: "admin" | "standard" };
  };

  const handleStartChat = async () => {
    setLoading(true);
    try {
      if (currentUserType === "admin") {
        if (!user || !targetUserId) {
          throw new Error(t("chat.startError"));
        }

        const conversation = await startAdminConversation(targetUserId);

        navigate(`/messages?conversation=admin:${conversation.id}`);
        return;
      }

      // Determine professional and clinic IDs
      const professionalId =
        currentUserType === "professional" ? currentProfileId : targetId;
      const clinicId =
        currentUserType === "clinic" ? currentProfileId : targetId;

      if (user && isGatewayBackendConfigured()) {
        const conversation = await startGatewayConversation(
          {
            user,
            userRole: currentUserType,
            clinicId: currentUserType === "clinic" ? clinicId : undefined,
            profileId:
              currentUserType === "professional" ? professionalId : undefined,
            onboardingCompleted: true,
            verificationStatus: "verified",
          },
          { clinicId, professionalId },
        );

        navigate(`/messages?conversation=standard:${conversation.id}`);
        return;
      }

      // Check if conversation already exists
      const { data: existing, error: fetchError } = await backendDb
        .from("conversations")
        .select("id")
        .eq("professional_id", professionalId)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let conversationId = existing?.id;

      // Create new conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConv, error: createError } = await backendDb
          .from("conversations")
          .insert({
            professional_id: professionalId,
            clinic_id: clinicId,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        conversationId = newConv.id;
      }

      // Navigate to messages page with conversation ID
      navigate(`/messages?conversation=standard:${conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        variant: "destructive",
        title: t("chat.startError"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setLoading(false);
    }
  };

  const isIconOnly = size === "icon";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartChat}
      disabled={loading}
      className={className}
      aria-label={t("chat.startChat")}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isIconOnly ? (
        <MessageCircle className="h-4 w-4" />
      ) : (
        <>
          <MessageCircle className="h-4 w-4 me-2" />
          {t("chat.startChat")}
        </>
      )}
    </Button>
  );
};

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";

const Messages = () => {
  const { t } = useTranslation();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const [userType, setUserType] = useState<
    "professional" | "clinic" | "admin" | null
  >(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveConversation, setHasActiveConversation] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    if (userRole === "admin" || userRole === "super_admin") {
      setUserType("admin");
      setProfileId(user.id);
      setLoading(false);
      return;
    }

    const profileMetadataId =
      typeof user.user_metadata?.profileId === "string"
        ? user.user_metadata.profileId
        : null;
    const clinicMetadataId =
      typeof user.user_metadata?.clinicId === "string"
        ? user.user_metadata.clinicId
        : null;

    if (userRole === "professional" && profileMetadataId) {
      setUserType("professional");
      setProfileId(profileMetadataId);
      setLoading(false);
      return;
    }

    if (userRole === "clinic" && clinicMetadataId) {
      setUserType("clinic");
      setProfileId(clinicMetadataId);
      setLoading(false);
      return;
    }

    navigate("/");
  }, [user, userRole, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!userType || !profileId) return null;

  return (
    <div
      className={`${hasActiveConversation ? "h-[calc(100dvh-3.5rem)] overflow-hidden" : "container max-w-6xl mx-auto px-4 py-4 pb-20"} md:container md:max-w-6xl md:mx-auto md:px-4 md:py-8 md:pb-8 md:!h-auto md:!overflow-visible`}
    >
      {/* Hide header on mobile when conversation is active */}
      <div
        className={`mb-4 md:mb-6 ${hasActiveConversation ? "hidden md:block" : "block"}`}
      >
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
          {t("chat.messages")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {userType === "admin"
            ? t("chat.adminMessagesDescription")
            : t("chat.messagesDescription")}
        </p>
      </div>

      <ChatContainer
        userType={userType}
        profileId={profileId}
        currentUserId={user.id}
        initialConversation={conversationParam}
        onConversationChange={setHasActiveConversation}
      />
    </div>
  );
};

export default Messages;

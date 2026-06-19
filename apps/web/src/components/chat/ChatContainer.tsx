import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChatList } from "./ChatList";
import { ChatMessages } from "./ChatMessages";
import { MessageCircle } from "lucide-react";

interface ChatContainerProps {
  userType: "professional" | "clinic" | "admin";
  profileId: string;
  currentUserId: string;
  initialConversation?: string | null;
  onConversationChange?: (hasConversation: boolean) => void;
}

export const ChatContainer = ({
  userType,
  profileId,
  currentUserId,
  initialConversation,
  onConversationChange,
}: ChatContainerProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(initialConversation || null);

  useEffect(() => {
    if (initialConversation) setSelectedConversation(initialConversation);
  }, [initialConversation]);

  useEffect(() => {
    onConversationChange?.(!!selectedConversation);
  }, [selectedConversation, onConversationChange]);

  return (
    <div
      className={`${selectedConversation ? "h-full" : "h-[calc(100dvh-3.5rem-5rem-6rem)]"} md:h-[600px] flex rounded-none md:rounded-xl border-x-0 md:border overflow-hidden bg-background`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Conversation List */}
      <div
        className={`w-full md:w-80 border-e flex-shrink-0 flex flex-col ${selectedConversation ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("chat.messages")}
          </h2>
        </div>
        <ChatList
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          userType={userType}
          profileId={profileId}
          currentUserId={currentUserId}
        />
      </div>

      {/* Chat Messages */}
      <div
        className={`flex-1 min-w-0 ${selectedConversation ? "flex" : "hidden md:flex"}`}
      >
        {selectedConversation ? (
          <ChatMessages
            conversationId={selectedConversation}
            userType={userType}
            profileId={profileId}
            currentUserId={currentUserId}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground w-full">
            <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
            <p>{t("chat.selectConversation")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

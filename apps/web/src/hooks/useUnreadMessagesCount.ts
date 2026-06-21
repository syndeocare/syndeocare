import { useEffect, useState } from "react";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

const POLL_INTERVAL_MS = 30000;

export const useUnreadMessagesCount = () => {
  const { user, userRole, isOnboardingComplete } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || !userRole || !isOnboardingComplete) {
      setCount(0);
      return;
    }

    const role = userRole === "super_admin" ? "admin" : userRole;
    let cancelled = false;

    const fetchUnreadCount = async () => {
      try {
        const [standardResult, adminResult] = await Promise.all([
          role === "admin"
            ? Promise.resolve({ data: [] as { id: string }[], error: null })
            : backendDb.from("conversations").select("id"),
          backendDb.from("admin_conversations").select("id"),
        ]);

        if (standardResult.error) throw standardResult.error;
        if (adminResult.error) throw adminResult.error;

        const standardConversations = standardResult.data || [];
        const adminConversations = adminResult.data || [];

        const counts = await Promise.all([
          ...standardConversations.map(async (conversation) => {
            const { count: unreadCount, error } = await backendDb
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conversation.id)
              .eq("is_read", false)
              .neq("sender_type", role);

            if (error) throw error;
            return unreadCount || 0;
          }),
          ...adminConversations.map(async (conversation) => {
            const { count: unreadCount, error } = await backendDb
              .from("admin_messages")
              .select("*", { count: "exact", head: true })
              .eq("admin_conversation_id", conversation.id)
              .eq("is_read", false)
              .neq("sender_type", role);

            if (error) throw error;
            return unreadCount || 0;
          }),
        ]);

        if (!cancelled) {
          setCount(counts.reduce((total, item) => total + item, 0));
        }
      } catch (error) {
        console.warn("Unable to load unread message count", error);
        if (!cancelled) {
          setCount(0);
        }
      }
    };

    void fetchUnreadCount();
    const intervalId = window.setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isOnboardingComplete, user, userRole]);

  return count;
};

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

    let cancelled = false;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await backendDb
          .from("conversations")
          .select("id, unread_count");

        if (error) throw error;

        if (!cancelled) {
          setCount(
            (data || []).reduce(
              (total: number, conversation: { unread_count?: number }) =>
                total + (conversation.unread_count ?? 0),
              0,
            ),
          );
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

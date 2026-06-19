import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AppNotification,
  clearNotifications,
  deleteNotification as deleteOwnedNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Calendar,
  MessageCircle,
  Shield,
  Star,
  Clock,
  X,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "booking_request":
    case "booking_accepted":
    case "booking_declined":
    case "booking_cancelled":
      return Calendar;
    case "new_message":
      return MessageCircle;
    case "verification_update":
      return Shield;
    case "rating_received":
      return Star;
    case "shift_reminder":
      return Clock;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "booking_accepted":
      return "text-success";
    case "booking_declined":
    case "booking_cancelled":
      return "text-destructive";
    case "new_message":
      return "text-sky";
    case "verification_update":
      return "text-warning";
    case "rating_received":
      return "text-warning";
    default:
      return "text-primary";
  }
};

const isQuietNotificationFetchError = (error: unknown) =>
  error instanceof Error &&
  (error.message === "Owned notifications are not available." ||
    error.message === "Missing or invalid bearer token.");

export const NotificationCenter = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        setNotifications(await listNotifications());
      } catch (error) {
        if (!isQuietNotificationFetchError(error)) {
          console.error("Error fetching notifications:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchNotifications();
    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const markAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = async (id: string) => {
    await deleteOwnedNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    await clearNotifications();
    setNotifications([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl"
          aria-label={t("notifications.title")}
        >
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -end-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 md:w-96 p-0"
        align={isRTL ? "start" : "end"}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t("notifications.title")}</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-8"
              >
                <CheckCheck className="h-4 w-4 me-1" />
                {t("notifications.markAllRead")}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-80">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const Icon = getNotificationIcon(notif.type);
                const iconColor = getNotificationColor(notif.type);

                return (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-secondary/50 transition-colors relative group ${
                      !notif.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`shrink-0 ${iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{notif.title}</p>
                          {!notif.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: isRTL ? ar : enUS,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsRead(notif.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteNotification(notif.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4 me-2" />
                {t("notifications.clearAll")}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

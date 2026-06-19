import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { backendDb } from "@/integrations/backend/client";

/**
 * Registers the device for push notifications and persists
 * the token in the `push_tokens` table for the current user.
 *
 * Safe to call on web — becomes a no-op.
 */
export function useNativePush(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      // Request permission
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return;

      await LocalNotifications.requestPermissions().catch(() => {});
      await PushNotifications.register();

      const tokenHandle = await PushNotifications.addListener(
        "registration",
        async (token: Token) => {
          await backendDb.from("push_tokens").upsert(
            {
              user_id: userId,
              token: token.value,
              platform: Capacitor.getPlatform(),
              device_name: navigator.userAgent.slice(0, 120),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" },
          );
        },
      );

      const errHandle = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          console.error("Push registration error", err);
        },
      );

      const recvHandle = await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          // Show as local notification while in foreground
          LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now() % 100000,
                title: notification.title ?? "SyndeoCare",
                body: notification.body ?? "",
                extra: notification.data,
              },
            ],
          }).catch(() => {});
        },
      );

      const actionHandle = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const data = action.notification.data || {};
          if (data.url) window.location.assign(String(data.url));
        },
      );

      cleanup = () => {
        tokenHandle.remove();
        errHandle.remove();
        recvHandle.remove();
        actionHandle.remove();
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [userId]);
}

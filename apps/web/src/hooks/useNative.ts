import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { Keyboard } from "@capacitor/keyboard";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Initializes all native side-effects once at app startup.
 * Safe to call on web — becomes a no-op.
 */
export function useNativeBootstrap() {
  useEffect(() => {
    if (!isNative()) return;

    (async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#3b1e5e" });
        }
      } catch (e) {
        console.warn("StatusBar setup failed", e);
      }

      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (e) {
        console.warn("SplashScreen hide failed", e);
      }

      // Hardware back button on Android → router back, or exit
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });

      // Keyboard avoidance
      Keyboard.addListener("keyboardWillShow", (info) => {
        document.documentElement.style.setProperty(
          "--keyboard-height",
          `${info.keyboardHeight}px`,
        );
      });
      Keyboard.addListener("keyboardWillHide", () => {
        document.documentElement.style.setProperty("--keyboard-height", "0px");
      });
    })();

    return () => {
      App.removeAllListeners();
      Keyboard.removeAllListeners();
    };
  }, []);
}

/** Reactive network status (online/offline). */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (!isNative()) {
      setOnline(navigator.onLine);
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener("online", on);
      window.addEventListener("offline", off);
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", off);
      };
    }
    Network.getStatus().then((s) => setOnline(s.connected));
    const handle = Network.addListener("networkStatusChange", (s) =>
      setOnline(s.connected),
    );
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);
  return online;
}

import type { CapacitorConfig } from "@capacitor/cli";

const defaultRemoteAppUrl = "http://54.221.113.197";
const remoteAppUrl =
  process.env.CAPACITOR_REMOTE_APP_URL?.trim() ||
  process.env.CAPACITOR_LIVE_RELOAD_URL?.trim() ||
  defaultRemoteAppUrl;
const remoteUpdatesDisabled =
  process.env.CAPACITOR_DISABLE_REMOTE_UPDATES === "true";

const config: CapacitorConfig = {
  appId: "app.lovable.d9cdd12a438c46568d56af72b6f76e2c",
  appName: "SyndeoCare",
  webDir: "dist",
  ...(!remoteUpdatesDisabled && remoteAppUrl
    ? {
        server: {
          url: remoteAppUrl,
          cleartext: remoteAppUrl.startsWith("http://"),
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b1e5e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#3b1e5e",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: true,
  },
};

export default config;

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { PushTokenRegistrationInput } from "../types";

const PUSH_TOKEN_KEY = "syndeocare.mobile.push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    priority: Notifications.AndroidNotificationPriority.HIGH,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getNotificationPlatform(): PushTokenRegistrationInput["platform"] {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return Platform.OS;
  }

  return "web";
}

async function storePushToken(token: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(PUSH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export async function getStoredPushToken() {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(PUSH_TOKEN_KEY) ?? null;
  }

  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export async function clearStoredPushToken() {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(PUSH_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export async function registerForPushNotifications(): Promise<PushTokenRegistrationInput | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#663C6D",
      name: "SyndeoCare",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await storePushToken(token.data);

  return {
    appVersion: Constants.expoConfig?.version,
    deviceName: Device.deviceName ?? undefined,
    platform: getNotificationPlatform(),
    provider: "expo",
    token: token.data,
  };
}

export async function syncAppBadge(count: number) {
  await Notifications.setBadgeCountAsync(Math.max(0, count));
}

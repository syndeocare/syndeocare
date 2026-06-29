import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import {
  Ubuntu_400Regular,
  Ubuntu_500Medium,
  Ubuntu_700Bold,
} from "@expo-google-fonts/ubuntu";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState, I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../src/lib/auth";
import { registerForPushNotifications } from "../src/lib/notifications";
import { registerPushToken } from "../src/lib/api";
import { PreferencesProvider } from "../src/lib/preferences";
import { queryClient } from "../src/lib/query";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_700Bold,
    Ubuntu_400Regular,
    Ubuntu_500Medium,
    Ubuntu_700Bold,
  });

  useEffect(() => {
    I18nManager.allowRTL(true);
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <AuthProvider>
              <AppLifecycle />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="conversation/[id]" />
              </Stack>
            </AuthProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppLifecycle() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    void registerForPushNotifications()
      .then(async (registration) => {
        if (!registration) return;
        await registerPushToken(registration).catch(() => undefined);
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void queryClient.invalidateQueries();
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}

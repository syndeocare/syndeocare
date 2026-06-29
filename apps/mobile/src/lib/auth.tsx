import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deletePushToken,
  logout as apiLogout,
  restoreSession,
  signIn as apiSignIn,
  signInWithGoogle as apiSignInWithGoogle,
  signUp as apiSignUp,
} from "./api";
import { clearStoredPushToken, getStoredPushToken } from "./notifications";
import { queryClient } from "./query";
import type { AuthSession, UserRole } from "../types";

type AuthContextValue = {
  isLoading: boolean;
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (role?: Exclude<UserRole, "admin">) => Promise<void>;
  signUp: (input: {
    displayName: string;
    email: string;
    password: string;
    role: Exclude<UserRole, "admin">;
  }) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSession(await restoreSession());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!session && !inAuth) {
      router.replace("/auth");
      return;
    }

    if (session && inAuth) {
      router.replace("/");
      return;
    }

    if (session && !session.principal.onboardingCompleted && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    if (session && session.principal.onboardingCompleted && inOnboarding) {
      router.replace("/");
    }
  }, [isLoading, router, segments, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      async signIn(email, password) {
        setSession(await apiSignIn(email, password));
      },
      async signInWithGoogle(role) {
        setSession(await apiSignInWithGoogle({ role }));
      },
      async signUp(input) {
        setSession(await apiSignUp(input));
      },
      async refresh() {
        await refresh();
      },
      async logout() {
        await getStoredPushToken()
          .then(async (pushToken) => {
            if (!pushToken) return;
            await deletePushToken(pushToken).catch(() => undefined);
            await clearStoredPushToken().catch(() => undefined);
          })
          .catch(() => undefined);
        await apiLogout();
        queryClient.clear();
        setSession(null);
        router.replace("/auth");
      },
    }),
    [isLoading, refresh, router, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

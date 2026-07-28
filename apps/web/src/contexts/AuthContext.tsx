import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AUTH_CONFIG, FEATURES } from "@/config/constants";
import {
  type AuthSession,
  type AuthUser,
  completeGoogleOAuthWithGateway,
  isGatewayAuthConfigured,
  logoutGatewaySession,
  readStoredGatewaySession,
  requestEmailOtp,
  restoreGatewaySession,
  signInWithGateway,
  signUpWithGateway,
  startGoogleOAuthWithGateway,
  syncGatewayExternalUserId,
  toClientAuthSession,
} from "@/lib/auth-backend";
import {
  getGatewayOnboardingStatus,
  isGatewayBackendConfigured,
  type BackendActorBridge,
} from "@/lib/platform-backend";

type UserRole = "professional" | "clinic" | "admin" | "super_admin";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

interface SignUpResult {
  error: Error | null;
  needsOnboarding: boolean;
  needsEmailConfirmation: boolean;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  userRole: UserRole | null;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    metadata: Record<string, string>,
  ) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (role?: "professional" | "clinic") => Promise<void>;
  completeGoogleOAuth: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function checkOnboardingStatus(
  userId: string,
  role: UserRole | null,
  user?: AuthUser | null,
): Promise<boolean> {
  if (!role || role === "admin" || role === "super_admin") {
    return true;
  }

  if (user && isGatewayBackendConfigured()) {
    try {
      const status = await getGatewayOnboardingStatus({
        user,
        userRole: role,
      } satisfies BackendActorBridge);

      return (
        status.onboardingCompleted ||
        status.verificationStatus === "pending_review" ||
        status.verificationStatus === "approved" ||
        (status.verificationStatus !== "rejected" &&
          Boolean(status.submittedAt))
      );
    } catch (error) {
      console.warn("Unable to load gateway onboarding status", error);
    }
  }

  void userId;
  return false;
}

function isPrincipalOnboardingComplete(
  principal: NonNullable<
    ReturnType<typeof readStoredGatewaySession>
  >["principal"],
) {
  return (
    principal.role === "admin" ||
    principal.onboardingCompleted ||
    principal.verificationStatus === "pending_review" ||
    principal.verificationStatus === "approved"
  );
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const applyStoredSession = useCallback(
    async (
      stored:
        | ReturnType<typeof readStoredGatewaySession>
        | Awaited<ReturnType<typeof restoreGatewaySession>>,
    ) => {
      if (!stored) {
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsOnboardingComplete(false);
        return;
      }

      const clientSession = toClientAuthSession(stored);
      const resolvedRole = stored.principal.role as UserRole;

      if (isGatewayBackendConfigured()) {
        try {
          await syncGatewayExternalUserId(clientSession.user.id);
        } catch (error) {
          console.warn("Failed to sync external user id", error);
        }
      }

      setSession(clientSession);
      setUser(clientSession.user);
      setUserRole(resolvedRole);
      setIsOnboardingComplete(
        isPrincipalOnboardingComplete(stored.principal) ||
          (await checkOnboardingStatus(
            clientSession.user.id,
            resolvedRole,
            clientSession.user,
          )),
      );
    },
    [],
  );

  const refreshOnboardingStatus = useCallback(async () => {
    if (!user || !userRole) {
      return;
    }

    setIsOnboardingComplete(
      await checkOnboardingStatus(user.id, userRole, user),
    );
  }, [user, userRole]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        if (!isGatewayAuthConfigured()) {
          await applyStoredSession(null);
          return;
        }

        const restored = await restoreGatewaySession();

        if (isMounted) {
          await applyStoredSession(restored);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [applyStoredSession]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      metadata: Record<string, string>,
    ): Promise<SignUpResult> => {
      const normalizedEmail = normalizeEmail(email);

      try {
        if (!isGatewayAuthConfigured()) {
          throw new Error("API gateway auth is not configured.");
        }

        if (role !== "professional" && role !== "clinic") {
          throw new Error(
            "Self-service registration is only available for professionals and clinics.",
          );
        }

        const displayName =
          (role === "clinic"
            ? metadata.organizationName
            : metadata.name
          )?.trim() ||
          metadata.name?.trim() ||
          normalizedEmail.split("@")[0] ||
          "User";

        const createdSession = await signUpWithGateway({
          displayName,
          email: normalizedEmail,
          password,
          role,
        });

        if (FEATURES.emailVerification) {
          await requestEmailOtp(normalizedEmail);
          await logoutGatewaySession(createdSession.tokens.refreshToken);
          await applyStoredSession(null);

          return {
            email: normalizedEmail,
            error: null,
            needsEmailConfirmation: true,
            needsOnboarding: false,
          };
        }

        await applyStoredSession(createdSession);

        return {
          email: normalizedEmail,
          error: null,
          needsEmailConfirmation: false,
          needsOnboarding: true,
        };
      } catch (error) {
        return {
          email: normalizedEmail,
          error: error as Error,
          needsEmailConfirmation: false,
          needsOnboarding: false,
        };
      }
    },
    [applyStoredSession],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = normalizeEmail(email);

      try {
        if (!isGatewayAuthConfigured()) {
          throw new Error("API gateway auth is not configured.");
        }

        const nextSession = await signInWithGateway(normalizedEmail, password);

        if (
          FEATURES.emailVerification &&
          nextSession.principal.emailVerified === false
        ) {
          await requestEmailOtp(normalizedEmail);
          await logoutGatewaySession(nextSession.tokens.refreshToken);
          await applyStoredSession(null);

          return {
            error: new Error(
              "Please verify your email before signing in. We've sent you a new verification link.",
            ),
          };
        }

        await applyStoredSession(nextSession);
        return { error: null };
      } catch (error) {
        await applyStoredSession(null);
        return { error: error as Error };
      }
    },
    [applyStoredSession],
  );

  const signInWithGoogle = useCallback(
    async (role?: "professional" | "clinic") => {
      if (!isGatewayAuthConfigured()) {
        throw new Error("API gateway auth is not configured.");
      }

      await startGoogleOAuthWithGateway({ role });
    },
    [],
  );

  const completeGoogleOAuth = useCallback(async () => {
    try {
      const nextSession = await completeGoogleOAuthWithGateway();
      await applyStoredSession(nextSession);
      return { error: null };
    } catch (error) {
      await applyStoredSession(null);
      return { error: error as Error };
    }
  }, [applyStoredSession]);

  const signOut = useCallback(async () => {
    const refreshToken = readStoredGatewaySession()?.tokens.refreshToken;
    await logoutGatewaySession(refreshToken);
    await applyStoredSession(null);
  }, [applyStoredSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isOnboardingComplete,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        completeGoogleOAuth,
        signOut,
        refreshOnboardingStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGatewayOnboardingStatus,
  isGatewayBackendConfigured,
} from "@/lib/platform-backend";

type ProfileAccessState =
  | "checking"
  | "allowed"
  | "unauthenticated"
  | "unverified";

export function useVerifiedProfileAccess() {
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [accessState, setAccessState] =
    useState<ProfileAccessState>("checking");

  useEffect(() => {
    let isMounted = true;

    const resolveAccess = async () => {
      if (authLoading) return;

      if (!user) {
        if (isMounted) setAccessState("unauthenticated");
        return;
      }

      if (userRole === "admin" || userRole === "super_admin") {
        if (isMounted) setAccessState("allowed");
        return;
      }

      if (userRole !== "professional" && userRole !== "clinic") {
        if (isMounted) setAccessState("unverified");
        return;
      }

      try {
        if (isGatewayBackendConfigured()) {
          const status = await getGatewayOnboardingStatus({
            user,
            userRole,
          });

          if (!isMounted) return;

          setAccessState(
            status.verificationStatus === "approved" ? "allowed" : "unverified",
          );
          return;
        }

        setAccessState("unverified");
      } catch (error) {
        console.error("Error resolving profile access:", error);
        if (isMounted) setAccessState("unverified");
      }
    };

    void resolveAccess();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user, userRole]);

  return {
    accessState: authLoading ? "checking" : accessState,
  };
}

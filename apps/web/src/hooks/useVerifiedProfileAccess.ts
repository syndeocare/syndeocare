import { useEffect, useState } from "react";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

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

      const table = userRole === "professional" ? "profiles" : "clinics";

      try {
        const { data, error } = await backendDb
          .from(table)
          .select("verification_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("Error resolving profile access:", error);
          setAccessState("unverified");
          return;
        }

        setAccessState(
          data?.verification_status === "verified" ? "allowed" : "unverified",
        );
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

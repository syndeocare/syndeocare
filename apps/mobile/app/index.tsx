import { Redirect } from "expo-router";

import { LoadingBlock, Screen } from "../src/components/ui";
import { useAuth } from "../src/lib/auth";

export default function Index() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <Screen>
        <LoadingBlock label="Restoring your secure session..." />
      </Screen>
    );
  }

  if (!session) return <Redirect href="/auth" />;
  if (!session.principal.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}

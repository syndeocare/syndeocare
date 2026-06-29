import { Stack } from "expo-router";
import { Text } from "react-native";

import {
  LoadingBlock,
  Screen,
  useTextStyles,
} from "../../../src/components/ui";
import { useT } from "../../../src/lib/preferences";

export default function OAuthCallbackScreen() {
  const t = useT();
  const text = useTextStyles();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen tone="auth">
        <LoadingBlock label={t("auth.googleCompleting")} />
        <Text style={text.body}>{t("auth.googleCloseHint")}</Text>
      </Screen>
    </>
  );
}

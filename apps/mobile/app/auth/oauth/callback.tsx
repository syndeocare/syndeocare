import { Stack } from "expo-router";
import { Text } from "react-native";

import {
  LoadingBlock,
  Screen,
  useTextStyles,
} from "../../../src/components/ui";

export default function OAuthCallbackScreen() {
  const text = useTextStyles();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen tone="auth">
        <LoadingBlock label="Completing Google sign-in..." />
        <Text style={text.body}>
          You can close this window if it does not close automatically.
        </Text>
      </Screen>
    </>
  );
}

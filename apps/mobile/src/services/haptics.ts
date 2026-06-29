import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const canHaptic = Platform.OS !== "web";

function runHaptic(action: () => Promise<void>) {
  if (!canHaptic) return;
  void action().catch(() => undefined);
}

export function hapticSelection() {
  runHaptic(() => Haptics.selectionAsync());
}

export function hapticLight() {
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSuccess() {
  runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function hapticWarning() {
  runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}

export function hapticError() {
  runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
}

export const haptics = {
  error: hapticError,
  light: hapticLight,
  medium: hapticMedium,
  selection: hapticSelection,
  success: hapticSuccess,
  warning: hapticWarning,
};

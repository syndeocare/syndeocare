import { useMemo } from "react";

import { usePreferences } from "../lib/preferences";

export function useDirectionalLayout() {
  const { direction, language } = usePreferences();
  const isRTL = direction === "rtl";

  return useMemo(
    () => ({
      direction,
      isArabic: language === "ar",
      isRTL,
      row: { flexDirection: isRTL ? "row-reverse" : "row" } as const,
      textAlign: isRTL ? ("right" as const) : ("left" as const),
      writingDirection: direction,
    }),
    [direction, isRTL, language],
  );
}

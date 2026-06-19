import { useEffect } from "react";

interface UseBookingRealtimeProps {
  professionalId?: string;
  clinicId?: string;
  onBookingUpdate?: () => void | Promise<void>;
  pollIntervalMs?: number;
}

export const useBookingRealtime = ({
  professionalId,
  clinicId,
  onBookingUpdate,
  pollIntervalMs = 30000,
}: UseBookingRealtimeProps) => {
  useEffect(() => {
    if ((!professionalId && !clinicId) || !onBookingUpdate) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void onBookingUpdate();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [clinicId, onBookingUpdate, pollIntervalMs, professionalId]);
};

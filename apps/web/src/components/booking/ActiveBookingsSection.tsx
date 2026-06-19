import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";
import CheckInOutCard from "./CheckInOutCard";
import RatingModal from "./RatingModal";
import CancelBookingModal from "./CancelBookingModal";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import {
  isGatewayBackendConfigured,
  listLegacyBookings,
} from "@/lib/platform-backend";

interface Booking {
  id: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  professional_id: string;
  clinic_id: string;
  shift: {
    id: string;
    title: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    location_address: string | null;
    clinic: {
      id: string;
      name: string;
    };
  };
}

interface ActiveBookingsSectionProps {
  profileId: string;
  userType: "professional" | "clinic";
}

const ActiveBookingsSection = ({
  profileId,
  userType,
}: ActiveBookingsSectionProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!profileId) return;

    try {
      const column =
        userType === "professional" ? "professional_id" : "clinic_id";

      if (user && isGatewayBackendConfigured()) {
        try {
          const data = await listLegacyBookings({
            user,
            userRole: userType,
            profileId: userType === "professional" ? profileId : undefined,
            clinicId: userType === "clinic" ? profileId : undefined,
          });
          setBookings((data as unknown as Booking[]) || []);
          return;
        } catch (error) {
          console.warn(
            "Falling back to BackendDb active bookings fetch",
            error,
          );
        }
      }

      const { data, error } = await backendDb
        .from("bookings")
        .select(
          `
          id,
          status,
          check_in_time,
          check_out_time,
          professional_id,
          clinic_id,
          shift:shifts(
            id,
            title,
            shift_date,
            start_time,
            end_time,
            hourly_rate,
            location_address,
            clinic:clinics(id, name)
          )
        `,
        )
        .eq(column, profileId)
        .in("status", ["accepted", "confirmed", "checked_in", "checked_out"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings((data as unknown as Booking[]) || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, user, userType]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  // Real-time updates
  useBookingRealtime({
    professionalId: userType === "professional" ? profileId : undefined,
    clinicId: userType === "clinic" ? profileId : undefined,
    onBookingUpdate: fetchBookings,
  });

  const handleRateClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowRatingModal(true);
  };

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  // Filter bookings needing rating (checked_out but not yet rated)
  const needsRating = bookings.filter((b) => b.status === "checked_out");
  const activeBookings = bookings.filter(
    (b) =>
      b.status === "accepted" ||
      b.status === "confirmed" ||
      b.status === "checked_in",
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title={t("booking.noActiveBookings")}
        description={t("booking.noActiveBookingsDesc")}
        variant="compact"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Needs Rating Section */}
      {needsRating.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-warning" />
            <h3 className="font-medium text-foreground">
              {t("booking.pendingRatings")}
            </h3>
          </div>
          <div className="space-y-3">
            {needsRating.map((booking) => (
              <div
                key={booking.id}
                className="bg-warning/5 border border-warning/20 rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {booking.shift.clinic.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.shift.title} -{" "}
                      {new Date(booking.shift.shift_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRateClick(booking)}
                    className="min-h-[44px]"
                  >
                    <Star className="w-4 h-4 me-2" aria-hidden="true" />
                    {t("booking.rateNow")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-medium text-foreground mb-3">
            {t("booking.activeShifts")}
          </h3>
          <div className="space-y-3">
            {activeBookings.map((booking) => (
              <div key={booking.id} className="relative">
                <CheckInOutCard booking={booking} onUpdate={fetchBookings} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 end-2 text-muted-foreground hover:text-destructive"
                  onClick={() => handleCancelClick(booking)}
                  aria-label={t("booking.cancel")}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rating Modal */}
      {selectedBooking && user && (
        <RatingModal
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          bookingId={selectedBooking.id}
          revieweeId={selectedBooking.shift.clinic.id}
          revieweeName={selectedBooking.shift.clinic.name}
          reviewerId={user.id}
          type="clinic"
          onSuccess={fetchBookings}
        />
      )}

      {/* Cancel Modal */}
      {selectedBooking && (
        <CancelBookingModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          bookingId={selectedBooking.id}
          shiftDate={selectedBooking.shift.shift_date}
          shiftStartTime={selectedBooking.shift.start_time}
          hourlyRate={selectedBooking.shift.hourly_rate}
          onSuccess={fetchBookings}
        />
      )}
    </div>
  );
};

export default ActiveBookingsSection;

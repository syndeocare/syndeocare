import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  LogIn,
  LogOut,
  Clock,
  MapPin,
  Calendar,
  Building2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Booking {
  id: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  shift: {
    id: string;
    title: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    location_address: string | null;
    clinic: {
      name: string;
    };
  };
}

interface CheckInOutCardProps {
  booking: Booking;
  onUpdate: () => void;
}

const CheckInOutCard = ({ booking, onUpdate }: CheckInOutCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await backendDb
        .from("bookings")
        .update({
          status: "checked_in",
          check_in_time: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast({
        title: t("booking.checkedInSuccess"),
        description: t("booking.checkedInSuccessDesc"),
      });
      onUpdate();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("booking.checkInError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await backendDb
        .from("bookings")
        .update({
          status: "checked_out",
          check_out_time: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast({
        title: t("booking.checkedOutSuccess"),
        description: t("booking.checkedOutSuccessDesc"),
      });
      onUpdate();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("booking.checkOutError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isToday = booking.shift.shift_date === format(new Date(), "yyyy-MM-dd");
  const canCheckIn =
    booking.status === "confirmed" || booking.status === "accepted";
  const canCheckOut = booking.status === "checked_in";
  const isCompleted =
    booking.status === "checked_out" || booking.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-foreground truncate">
                {booking.shift.clinic.name}
              </h4>
              <Badge
                variant={
                  isCompleted
                    ? "default"
                    : isToday
                      ? "destructive"
                      : "secondary"
                }
                className={
                  isCompleted
                    ? "bg-success/10 text-success border-success/20"
                    : ""
                }
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 me-1" />
                    {t("booking.completed")}
                  </>
                ) : isToday ? (
                  t("common.today")
                ) : (
                  t("booking.upcoming")
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {booking.shift.title}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                {format(new Date(booking.shift.shift_date), "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" aria-hidden="true" />
                {booking.shift.start_time} - {booking.shift.end_time}
              </span>
              {booking.shift.location_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span className="truncate max-w-[150px]">
                    {booking.shift.location_address}
                  </span>
                </span>
              )}
            </div>

            {/* Check-in/out timestamps */}
            {booking.check_in_time && (
              <p className="text-xs text-success mt-2">
                {t("booking.checkedInAt")}:{" "}
                {format(new Date(booking.check_in_time), "h:mm a")}
              </p>
            )}
            {booking.check_out_time && (
              <p className="text-xs text-success">
                {t("booking.checkedOutAt")}:{" "}
                {format(new Date(booking.check_out_time), "h:mm a")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {canCheckIn && isToday && (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading}
              size="sm"
              className="min-h-[44px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 me-2" aria-hidden="true" />
                  {t("booking.checkIn")}
                </>
              )}
            </Button>
          )}
          {canCheckOut && (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading}
              size="sm"
              variant="secondary"
              className="min-h-[44px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4 me-2" aria-hidden="true" />
                  {t("booking.checkOut")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CheckInOutCard;

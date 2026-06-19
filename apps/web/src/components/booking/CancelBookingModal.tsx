import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInHours, parseISO } from "date-fns";

interface CancelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  shiftDate: string;
  shiftStartTime: string;
  hourlyRate: number;
  onSuccess?: () => void;
}

const CancelBookingModal = ({
  open,
  onOpenChange,
  bookingId,
  shiftDate,
  shiftStartTime,
  hourlyRate,
  onSuccess,
}: CancelBookingModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate hours until shift
  const shiftDateTime = parseISO(`${shiftDate}T${shiftStartTime}`);
  const hoursUntilShift = differenceInHours(shiftDateTime, new Date());

  // Cancellation fee policy
  // - 48+ hours: No fee
  // - 24-48 hours: 25% of estimated earnings
  // - 12-24 hours: 50% of estimated earnings
  // - <12 hours: 100% of estimated earnings
  const calculateFee = () => {
    if (hoursUntilShift >= 48) return 0;
    if (hoursUntilShift >= 24) return hourlyRate * 2 * 0.25; // Assume 2 hour minimum
    if (hoursUntilShift >= 12) return hourlyRate * 2 * 0.5;
    return hourlyRate * 2; // Full 2 hours
  };

  const cancellationFee = calculateFee();
  const feeLevel =
    hoursUntilShift >= 48
      ? "none"
      : hoursUntilShift >= 24
        ? "low"
        : hoursUntilShift >= 12
          ? "medium"
          : "high";

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast({
        title: t("booking.reasonRequired"),
        description: t("booking.reasonRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await backendDb
        .from("bookings")
        .update({
          status: "cancelled",
          cancellation_reason: reason.trim(),
          cancellation_fee: cancellationFee,
        })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: t("booking.cancelledSuccess"),
        description:
          cancellationFee > 0
            ? t("booking.cancelledWithFee", { fee: cancellationFee.toFixed(2) })
            : t("booking.cancelledNoFee"),
      });

      onSuccess?.();
      onOpenChange(false);
      setReason("");
    } catch (error) {
      console.error("Cancellation error:", error);
      toast({
        title: t("common.error"),
        description: t("booking.cancelError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("booking.cancelBooking")}</DialogTitle>
          <DialogDescription>{t("booking.cancelDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cancellation Fee Warning */}
          {feeLevel !== "none" && (
            <Alert variant={feeLevel === "high" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {feeLevel === "high" && t("booking.lateCancelWarning")}
                {feeLevel === "medium" && t("booking.mediumCancelWarning")}
                {feeLevel === "low" && t("booking.earlyCancelWarning")}
                <p className="mt-2 font-semibold">
                  {t("booking.cancellationFee")}: ${cancellationFee.toFixed(2)}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {feeLevel === "none" && (
            <Alert>
              <AlertDescription className="text-success">
                {t("booking.noCancelFee")}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Policy */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-foreground mb-2">
              {t("booking.cancellationPolicy")}
            </p>
            <ul className="space-y-1">
              <li>
                • 48+ {t("booking.hoursNotice")}: {t("booking.noFee")}
              </li>
              <li>
                • 24-48 {t("booking.hoursNotice")}: 25% {t("booking.fee")}
              </li>
              <li>
                • 12-24 {t("booking.hoursNotice")}: 50% {t("booking.fee")}
              </li>
              <li>
                • &lt;12 {t("booking.hoursNotice")}: 100% {t("booking.fee")}
              </li>
            </ul>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label
              htmlFor="reason"
              className="text-sm font-medium text-foreground"
            >
              {t("booking.cancellationReason")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="reason"
              placeholder={t("booking.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("common.goBack")}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancel}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("booking.confirmCancel")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelBookingModal;

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Banknote,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  BackendRequestError,
  isGatewayBackendConfigured,
  isVerifiedStatus,
  listLegacyBookings,
  requestLegacyBooking,
} from "@/lib/platform-backend";
import { formatHourlyRate, formatMoney } from "@/lib/format";

interface Shift {
  id: string;
  source?: "platform" | "legacy";
  title: string;
  role_required: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  currency?: string;
  location_address: string | null;
  description: string | null;
  required_certifications: string[] | null;
  is_urgent: boolean;
  clinic: {
    id: string;
    name: string;
    address: string | null;
    rating_avg: number | null;
  };
}

interface ShiftDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  profileId: string;
  verificationStatus: string;
  currentBookingStatus?: string;
  onApplicationSuccess?: () => void;
}

const conflictBookingStatuses = new Set([
  "accepted",
  "confirmed",
  "checked_in",
]);

function buildShiftDateTime(date: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const parsed = new Date(`${date}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildShiftRange(input: {
  shift_date: string;
  start_time: string;
  end_time: string;
}) {
  const start = buildShiftDateTime(input.shift_date, input.start_time);
  const end = buildShiftDateTime(input.shift_date, input.end_time);

  if (!start || !end) return null;

  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function shiftRangesOverlap(
  first: NonNullable<ReturnType<typeof buildShiftRange>>,
  second: NonNullable<ReturnType<typeof buildShiftRange>>,
) {
  return first.start < second.end && second.start < first.end;
}

const ShiftDetailModal = ({
  open,
  onOpenChange,
  shift,
  profileId,
  verificationStatus,
  currentBookingStatus,
  onApplicationSuccess,
}: ShiftDetailModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const language = i18n.language === "ar" ? "ar" : "en";
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [proposal, setProposal] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const isVerified = isVerifiedStatus(verificationStatus);
  const canViewClinicIdentity = [
    "accepted",
    "confirmed",
    "completed",
    "checked_in",
    "checked_out",
  ].includes(currentBookingStatus ?? "");

  // Check for shift overlap on mount - must be before any conditional returns
  useEffect(() => {
    const checkOverlap = async () => {
      if (!profileId || !shift) return;

      if (isGatewayBackendConfigured() && shift.source === "platform") {
        if (!user) {
          setHasConflict(false);
          return;
        }

        try {
          const targetRange = buildShiftRange(shift);
          if (!targetRange) {
            setHasConflict(false);
            return;
          }

          const bookings = await listLegacyBookings({
            user,
            userRole: "professional",
            profileId,
            verificationStatus:
              verificationStatus === "verified"
                ? "verified"
                : verificationStatus === "rejected"
                  ? "rejected"
                  : "pending",
          });

          const hasPlatformConflict = bookings.some((booking) => {
            if (booking.shift.id === shift.id) return false;
            if (!conflictBookingStatuses.has(booking.status)) return false;

            const bookedRange = buildShiftRange(booking.shift);
            return bookedRange
              ? shiftRangesOverlap(targetRange, bookedRange)
              : false;
          });

          setHasConflict(hasPlatformConflict);
        } catch (error) {
          console.warn("Unable to check platform shift overlap", error);
          setHasConflict(false);
        }
        return;
      }

      const { data, error } = await backendDb.rpc("check_shift_overlap", {
        p_professional_id: profileId,
        p_shift_id: shift.id,
      });
      if (error) {
        console.warn("Unable to check legacy shift overlap", error);
        setHasConflict(false);
        return;
      }
      setHasConflict(data === true);
    };
    checkOverlap();
  }, [profileId, shift, user, verificationStatus]);

  useEffect(() => {
    setProposal("");
    setHasApplied(Boolean(currentBookingStatus));
  }, [currentBookingStatus, shift?.id]);

  // Early return AFTER all hooks
  if (!shift) return null;

  const handleApply = async () => {
    if (!isVerified) {
      toast({
        variant: "destructive",
        title: t("shifts.modal.verificationRequired"),
        description: t("shifts.modal.verificationRequiredDesc"),
      });
      return;
    }

    if (hasConflict) {
      toast({
        variant: "destructive",
        title: t("shifts.modal.conflictTitle"),
        description: t("shifts.modal.conflictDesc"),
      });
      return;
    }

    setIsApplying(true);
    try {
      if (user && isGatewayBackendConfigured() && shift.source === "platform") {
        const booking = await requestLegacyBooking(
          {
            user,
            userRole: "professional",
            profileId,
            verificationStatus:
              verificationStatus === "verified"
                ? "verified"
                : verificationStatus === "rejected"
                  ? "rejected"
                  : "pending",
          },
          shift.id,
          proposal.trim() || undefined,
        );

        if (booking.status === "requested") {
          toast({
            title: t("shifts.applySuccess"),
            description: t("shifts.modal.applicantAcceptedDesc"),
          });
        } else {
          toast({
            title: t("shifts.modal.alreadyApplied"),
            description: t("shifts.modal.alreadyAppliedDesc"),
          });
        }

        setHasApplied(true);
        onApplicationSuccess?.();
        return;
      }

      // Check if already applied
      const { data: existing } = await backendDb
        .from("bookings")
        .select("id")
        .eq("shift_id", shift.id)
        .eq("professional_id", profileId)
        .single();

      if (existing) {
        toast({
          variant: "destructive",
          title: t("shifts.modal.alreadyApplied"),
          description: t("shifts.modal.alreadyAppliedDesc"),
        });
        setHasApplied(true);
        return;
      }

      // Create booking request
      const { error } = await backendDb.from("bookings").insert({
        shift_id: shift.id,
        professional_id: profileId,
        clinic_id: shift.clinic.id,
        status: "requested",
        notes: proposal.trim() || null,
      });

      if (error) throw error;

      toast({
        title: t("shifts.applySuccess"),
        description: t("shifts.modal.applicantAcceptedDesc"),
      });

      setHasApplied(true);
      onApplicationSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("shifts.applyError");
      const code =
        error instanceof BackendRequestError ? error.code : undefined;
      const status =
        error instanceof BackendRequestError ? error.status : undefined;

      if (
        code === "BOOKING_VERIFICATION_REQUIRED" ||
        status === 403 ||
        message.toLowerCase().includes("verification-approved")
      ) {
        toast({
          variant: "destructive",
          title: t("shifts.modal.verificationRequired"),
          description: t("shifts.modal.verificationRequiredDesc"),
        });
        return;
      }

      if (
        code === "BOOKING_ALREADY_EXISTS" ||
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("already applied")
      ) {
        setHasApplied(true);
        toast({
          variant: "destructive",
          title: t("shifts.modal.alreadyApplied"),
          description: t("shifts.modal.alreadyAppliedDesc"),
        });
        return;
      }

      if (code === "JOB_NOT_OPEN" || code === "JOB_ALREADY_STARTED") {
        toast({
          variant: "destructive",
          title: t("shifts.modal.shiftUnavailable"),
          description: t("shifts.modal.shiftUnavailableDesc"),
        });
        onApplicationSuccess?.();
        return;
      }

      if (
        code === "BOOKING_SCHEDULE_CONFLICT" ||
        code === "BOOKING_CONFLICT" ||
        message.toLowerCase().includes("schedule conflict") ||
        message.toLowerCase().includes("overlap") ||
        message.includes("تعارض") ||
        message.includes("تقاطع")
      ) {
        setHasConflict(true);
        toast({
          variant: "destructive",
          title: t("shifts.modal.conflictTitle"),
          description: t("shifts.modal.conflictDesc"),
        });
        return;
      }

      toast({
        variant: "destructive",
        title: t("shifts.applyError"),
        description:
          message === "An unexpected error occurred."
            ? t("shifts.modal.applyUnexpectedDesc")
            : message,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const calculateShiftHours = () => {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);
    const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
    return hours > 0 ? hours : 24 + hours;
  };

  const estimatedEarnings = calculateShiftHours() * shift.hourly_rate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {shift.title}
            {shift.is_urgent && (
              <Badge variant="destructive" className="text-xs">
                {t("common.urgent")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{shift.role_required}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Key Details */}
          <div
            className="grid grid-cols-2 gap-3"
            role="list"
            aria-label={t("shifts.modal.details")}
          >
            <div
              className="bg-secondary/50 rounded-lg p-4 min-h-[72px]"
              role="listitem"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>{t("shifts.date")}</span>
              </div>
              <p className="font-medium text-foreground">
                {new Date(shift.shift_date).toLocaleDateString(
                  isRTL ? "ar-SA" : "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  },
                )}
              </p>
            </div>
            <div
              className="bg-secondary/50 rounded-lg p-4 min-h-[72px]"
              role="listitem"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{t("shifts.time")}</span>
              </div>
              <p className="font-medium text-foreground">
                {shift.start_time} - {shift.end_time}
              </p>
            </div>
            <div
              className="bg-secondary/50 rounded-lg p-4 min-h-[72px]"
              role="listitem"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Banknote className="w-4 h-4" aria-hidden="true" />
                <span>{t("shifts.rate")}</span>
              </div>
              <p className="font-medium text-foreground">
                {formatHourlyRate(shift.hourly_rate, language, shift.currency)}
              </p>
            </div>
            <div
              className="bg-primary/10 rounded-lg p-4 min-h-[72px]"
              role="listitem"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Banknote className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>{t("shifts.modal.estimated")}</span>
              </div>
              <p className="font-bold text-primary">
                {formatMoney(estimatedEarnings, language, shift.currency)}
              </p>
            </div>
          </div>

          {/* Location */}
          {shift.location_address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("shifts.location")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {shift.location_address}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {shift.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  {t("shifts.description")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {shift.description}
                </p>
              </div>
            </>
          )}

          {/* Required Certifications */}
          {shift.required_certifications &&
            shift.required_certifications.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t("shifts.fields.requiredCertifications")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shift.required_certifications.map((cert, i) => (
                      <Badge key={i} variant="secondary">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

          {/* Clinic Info */}
          <Separator />
          {canViewClinicIdentity ? (
            <Link
              to={`/clinic/${shift.clinic.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {shift.clinic.name}
                </p>
                {shift.clinic.address && (
                  <p className="text-sm text-muted-foreground">
                    {shift.clinic.address}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {shift.clinic.rating_avg && (
                  <Badge variant="secondary" className="text-sm">
                    ★ {shift.clinic.rating_avg.toFixed(1)}
                  </Badge>
                )}
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {t("shifts.modal.clinicHidden")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("shifts.modal.clinicHiddenDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Verification Warning */}
          {!isVerified && (
            <div
              id="verification-warning"
              role="alert"
              className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3"
            >
              <Shield
                className="w-5 h-5 text-warning mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("shifts.modal.verificationRequired")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("shifts.modal.verificationRequiredDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Conflict Warning */}
          {hasConflict && (
            <div
              id="conflict-warning"
              role="alert"
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3"
            >
              <AlertCircle
                className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("shifts.modal.conflictTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("shifts.modal.conflictDesc")}
                </p>
              </div>
            </div>
          )}

          {isVerified && !hasApplied && !hasConflict && (
            <>
              <Separator />
              <div className="space-y-2">
                <label
                  htmlFor="shift-proposal"
                  className="text-sm font-medium text-foreground"
                >
                  {t("shifts.modal.proposalLabel")}
                </label>
                <Textarea
                  id="shift-proposal"
                  value={proposal}
                  onChange={(event) => setProposal(event.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder={t("shifts.modal.proposalPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {proposal.length}/500
                </p>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 min-h-[48px]"
              onClick={() => onOpenChange(false)}
            >
              {t("common.close")}
            </Button>
            <Button
              className="flex-1 min-h-[48px]"
              disabled={!isVerified || isApplying || hasApplied || hasConflict}
              onClick={handleApply}
              aria-describedby={
                !isVerified
                  ? "verification-warning"
                  : hasConflict
                    ? "conflict-warning"
                    : undefined
              }
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t("shifts.modal.applying")}
                </>
              ) : hasApplied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {t("shifts.applied")}
                </>
              ) : hasConflict ? (
                t("shifts.modal.timeConflict")
              ) : (
                t("shifts.modal.applyForShift")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDetailModal;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Banknote,
  Building2,
  Check,
  X,
  Loader2,
  MapPin,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { createNotification } from "@/lib/notifications";
import { formatHourlyRate } from "@/lib/format";

interface ShiftInvitation {
  id: string;
  shift_id: string;
  clinic_id: string;
  professional_id: string;
  status: string;
  message: string | null;
  created_at: string;
  shift?: {
    id: string;
    title: string;
    role_required: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    currency?: string;
    location_address: string | null;
  };
  clinic?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface ShiftInvitationCardProps {
  invitation: ShiftInvitation;
  onRespond?: () => void;
}

const ShiftInvitationCard = ({
  invitation,
  onRespond,
}: ShiftInvitationCardProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const language = isRTL ? "ar" : "en";
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Update invitation status
      const { error: invErr } = await backendDb
        .from("shift_invitations")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (invErr) throw invErr;

      // Create a booking
      const { error: bookErr } = await backendDb.from("bookings").insert({
        shift_id: invitation.shift_id,
        professional_id: invitation.professional_id,
        clinic_id: invitation.clinic_id,
        status: "requested",
      });

      if (bookErr) throw bookErr;

      // Notify clinic
      const { data: clinicData } = await backendDb
        .from("clinics")
        .select("user_id")
        .eq("id", invitation.clinic_id)
        .single();

      if (clinicData) {
        await createNotification({
          userId: clinicData.user_id,
          title: t("shifts.invitations.acceptedNotif"),
          message: t("shifts.invitations.acceptedNotifDesc"),
          type: "invitation_accepted",
          data: { shift_id: invitation.shift_id },
        });
      }

      toast({
        title: t("shifts.invitations.accepted"),
        description: t("shifts.invitations.acceptedDesc"),
      });
      onRespond?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const { error } = await backendDb
        .from("shift_invitations")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (error) throw error;

      toast({
        title: t("shifts.invitations.declined"),
        description: t("shifts.invitations.declinedDesc"),
      });
      onRespond?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const shift = invitation.shift;
  const clinic = invitation.clinic;

  return (
    <Card
      className="border-primary/20 bg-primary/5"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{clinic?.name}</span>
              <Badge variant="secondary" className="text-xs">
                {t("shifts.invitations.invitation")}
              </Badge>
            </div>
            <h4 className="font-semibold">
              {shift?.title || shift?.role_required}
            </h4>
          </div>
        </div>

        {invitation.message && (
          <p className="text-sm text-muted-foreground mb-3 italic">
            "{invitation.message}"
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {shift?.shift_date &&
              new Date(shift.shift_date).toLocaleDateString(
                isRTL ? "ar-SA" : "en-US",
                { month: "short", day: "numeric" },
              )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {shift?.start_time} - {shift?.end_time}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Banknote className="w-3.5 h-3.5" />
            {formatHourlyRate(
              shift?.hourly_rate ?? 0,
              language,
              shift?.currency,
            )}
          </div>
          {shift?.location_address && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{shift.location_address}</span>
            </div>
          )}
        </div>

        {invitation.status === "pending" ? (
          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="flex-1 min-h-[44px]"
              size="sm"
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 me-1" />
              )}
              {t("shifts.invitations.accept")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              className="flex-1 min-h-[44px]"
              size="sm"
            >
              {isDeclining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4 me-1" />
              )}
              {t("shifts.invitations.decline")}
            </Button>
          </div>
        ) : (
          <Badge
            variant={invitation.status === "accepted" ? "default" : "secondary"}
          >
            {invitation.status === "accepted"
              ? t("shifts.invitations.accepted")
              : t("shifts.invitations.declined")}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

export default ShiftInvitationCard;

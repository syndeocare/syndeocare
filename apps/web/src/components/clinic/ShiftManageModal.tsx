import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Send,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import ApplicantCard from "./ApplicantCard";
import {
  notifyBookingAccepted,
  notifyBookingDeclined,
} from "@/lib/notifications";
import InviteProfessionalsModal from "./InviteProfessionalsModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  isGatewayBackendConfigured,
  listLegacyBookings,
  updateLegacyBookingStatus,
} from "@/lib/platform-backend";

interface Shift {
  id: string;
  source?: "platform" | "legacy";
  title: string;
  role_required: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  location_address: string | null;
  description: string | null;
  is_filled: boolean;
  is_urgent: boolean;
}

interface Applicant {
  id: string;
  status: string;
  created_at: string;
  notes?: string | null;
  professional: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating_avg: number | null;
    location_address: string | null;
    specialties: string[] | null;
    verification_status: string;
  };
}

interface ShiftManageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  clinicId: string;
  onUpdate?: () => void;
}

const ShiftManageModal = ({
  open,
  onOpenChange,
  shift,
  clinicId,
  onUpdate,
}: ShiftManageModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchInvitations = useCallback(async () => {
    if (!shift) return;

    if (isGatewayBackendConfigured() && shift.source === "platform") {
      setInvitations([]);
      return;
    }

    const { data } = await backendDb
      .from("shift_invitations")
      .select("id, professional_id, status, message, created_at")
      .eq("shift_id", shift.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Enrich with professional data
      const enriched = await Promise.all(
        data.map(async (inv: any) => {
          const { data: pro } = await backendDb
            .from("profiles")
            .select("id, full_name, avatar_url, rating_avg, specialties")
            .eq("id", inv.professional_id)
            .single();
          return { ...inv, professional: pro };
        }),
      );
      setInvitations(enriched);
    }
  }, [shift]);

  const fetchApplicants = useCallback(async () => {
    if (!shift) return;

    setIsLoading(true);
    try {
      if (user && isGatewayBackendConfigured() && shift.source === "platform") {
        const bookings = await listLegacyBookings({
          user,
          userRole: "clinic",
          clinicId,
          onboardingCompleted: true,
          verificationStatus: "verified",
        });
        setApplicants(
          bookings
            .filter((booking) => booking.shift.id === shift.id)
            .map((booking) => ({
              id: booking.id,
              status:
                booking.status === "cancelled" ? "declined" : booking.status,
              notes: booking.notes,
              created_at: "",
              professional: {
                id: booking.professional_id,
                full_name:
                  booking.professional_name ??
                  t("nav.forProfessionals", "Professional"),
                avatar_url: null,
                rating_avg: null,
                location_address: booking.shift.location_address,
                specialties: [booking.shift.title],
                verification_status: "verified",
              },
            })),
        );
        return;
      }

      const { data, error } = await backendDb
        .from("bookings")
        .select(
          `
          id,
          status,
          created_at,
          professional:profiles!bookings_professional_id_fkey(
            id,
            full_name,
            avatar_url,
            rating_avg,
            location_address,
            specialties,
            verification_status
          )
        `,
        )
        .eq("shift_id", shift.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplicants(data as unknown as Applicant[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, shift, t, toast, user]);

  useEffect(() => {
    if (!open || !shift) {
      return;
    }

    void fetchApplicants();
    void fetchInvitations();

    const intervalId = window.setInterval(() => {
      void fetchApplicants();
      void fetchInvitations();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchApplicants, fetchInvitations, open, shift]);

  const handleAccept = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      if (
        user &&
        isGatewayBackendConfigured() &&
        shift?.source === "platform"
      ) {
        await updateLegacyBookingStatus(
          {
            user,
            userRole: "clinic",
            clinicId,
            onboardingCompleted: true,
            verificationStatus: "verified",
          },
          bookingId,
          "accepted",
        );

        toast({
          title: t("shifts.modal.applicantAccepted"),
          description: t("shifts.modal.applicantAcceptedDesc"),
        });

        await fetchApplicants();
        onUpdate?.();
        return;
      }

      // Find the applicant to get their user_id for notification
      const acceptedApplicant = applicants.find((a) => a.id === bookingId);

      // Accept this booking
      const { error: acceptError } = await backendDb
        .from("bookings")
        .update({ status: "accepted" })
        .eq("id", bookingId);

      if (acceptError) throw acceptError;

      // Get other pending applicants before declining them
      const otherPending = applicants.filter(
        (a) => a.status === "requested" && a.id !== bookingId,
      );

      // Decline all other pending bookings for this shift
      const { error: declineError } = await backendDb
        .from("bookings")
        .update({ status: "declined" })
        .eq("shift_id", shift!.id)
        .eq("status", "requested")
        .neq("id", bookingId);

      if (declineError) throw declineError;

      // Mark shift as filled
      const { error: fillError } = await backendDb
        .from("shifts")
        .update({ is_filled: true })
        .eq("id", shift!.id);

      if (fillError) throw fillError;

      // Send notification to accepted applicant
      if (acceptedApplicant) {
        const { data: profileData } = await backendDb
          .from("profiles")
          .select("user_id")
          .eq("id", acceptedApplicant.professional.id)
          .single();

        if (profileData) {
          // Get clinic name for notification
          const { data: clinicData } = await backendDb
            .from("clinics")
            .select("name")
            .eq("id", clinicId)
            .single();

          await notifyBookingAccepted(
            profileData.user_id,
            clinicData?.name || "The clinic",
            shift!.title,
            bookingId,
          );
        }
      }

      // Send notifications to declined applicants
      for (const applicant of otherPending) {
        const { data: profileData } = await backendDb
          .from("profiles")
          .select("user_id")
          .eq("id", applicant.professional.id)
          .single();

        if (profileData) {
          const { data: clinicData } = await backendDb
            .from("clinics")
            .select("name")
            .eq("id", clinicId)
            .single();

          await notifyBookingDeclined(
            profileData.user_id,
            clinicData?.name || "The clinic",
            shift!.title,
            applicant.id,
          );
        }
      }

      toast({
        title: t("shifts.modal.applicantAccepted"),
        description: t("shifts.modal.applicantAcceptedDesc"),
      });

      await fetchApplicants();
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      if (
        user &&
        isGatewayBackendConfigured() &&
        shift?.source === "platform"
      ) {
        await updateLegacyBookingStatus(
          {
            user,
            userRole: "clinic",
            clinicId,
            onboardingCompleted: true,
            verificationStatus: "verified",
          },
          bookingId,
          "cancelled",
        );

        toast({
          title: t("shifts.modal.applicantDeclined"),
          description: t("shifts.modal.applicantDeclinedDesc"),
        });

        await fetchApplicants();
        onUpdate?.();
        return;
      }

      // Find the applicant to get their user_id for notification
      const declinedApplicant = applicants.find((a) => a.id === bookingId);

      const { error } = await backendDb
        .from("bookings")
        .update({ status: "declined" })
        .eq("id", bookingId);

      if (error) throw error;

      // Send notification to declined applicant
      if (declinedApplicant) {
        const { data: profileData } = await backendDb
          .from("profiles")
          .select("user_id")
          .eq("id", declinedApplicant.professional.id)
          .single();

        if (profileData) {
          const { data: clinicData } = await backendDb
            .from("clinics")
            .select("name")
            .eq("id", clinicId)
            .single();

          await notifyBookingDeclined(
            profileData.user_id,
            clinicData?.name || "The clinic",
            shift!.title,
            bookingId,
          );
        }
      }

      toast({
        title: t("shifts.modal.applicantDeclined"),
        description: t("shifts.modal.applicantDeclinedDesc"),
      });

      await fetchApplicants();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!shift) return null;

  const pendingApplicants = applicants.filter((a) => a.status === "requested");
  const acceptedApplicants = applicants.filter(
    (a) => a.status === "accepted" || a.status === "confirmed",
  );
  const declinedApplicants = applicants.filter((a) => a.status === "declined");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("shifts.modal.manageShift")}
            {shift.is_filled ? (
              <Badge className="bg-success/10 text-success border-success/20">
                <CheckCircle2 className="w-3 h-3 me-1" />
                {t("shifts.filled")}
              </Badge>
            ) : shift.is_urgent ? (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 me-1" />
                {t("common.urgent")}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("shifts.open")}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>{shift.role_required}</DialogDescription>
        </DialogHeader>

        {/* Shift Summary */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
          role="list"
          aria-label={t("shifts.modal.details")}
        >
          <div
            className="bg-secondary/50 rounded-lg p-3 min-h-[64px]"
            role="listitem"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span>{t("shifts.date")}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {new Date(shift.shift_date).toLocaleDateString(
                isRTL ? "ar-SA" : "en-US",
                {
                  month: "short",
                  day: "numeric",
                },
              )}
            </p>
          </div>
          <div
            className="bg-secondary/50 rounded-lg p-3 min-h-[64px]"
            role="listitem"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <span>{t("shifts.time")}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {shift.start_time} - {shift.end_time}
            </p>
          </div>
          <div
            className="bg-secondary/50 rounded-lg p-3 min-h-[64px]"
            role="listitem"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3 h-3" aria-hidden="true" />
              <span>{t("shifts.rate")}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              ${shift.hourly_rate}
              {t("common.perHour")}
            </p>
          </div>
          <div
            className="bg-secondary/50 rounded-lg p-3 min-h-[64px]"
            role="listitem"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Users className="w-3 h-3" aria-hidden="true" />
              <span>{t("dashboard.applicants")}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {applicants.length}
            </p>
          </div>
        </div>

        {shift.location_address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4" />
            {shift.location_address}
          </div>
        )}

        <Separator />

        {/* Applicants */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="sr-only">{t("common.loading")}</span>
          </div>
        ) : applicants.length === 0 ? (
          <div className="text-center py-8" role="status">
            <Users
              className="w-10 h-10 text-muted-foreground mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-muted-foreground font-medium">
              {t("shifts.modal.noApplicantsYet")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("shifts.modal.noApplicantsDesc")}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="mt-4">
            <TabsList className="grid w-full grid-cols-4 min-h-[44px]">
              <TabsTrigger value="pending" className="min-h-[40px]">
                {t("shifts.modal.pendingTab")}
                {pendingApplicants.length > 0 && (
                  <span className="ms-2 px-1.5 py-0.5 text-xs bg-warning text-warning-foreground rounded-full">
                    {pendingApplicants.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted" className="min-h-[40px]">
                {t("shifts.modal.acceptedTab")}
                {acceptedApplicants.length > 0 && (
                  <span className="ms-2 px-1.5 py-0.5 text-xs bg-success text-success-foreground rounded-full">
                    {acceptedApplicants.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="declined" className="min-h-[40px]">
                {t("shifts.modal.declinedTab")} ({declinedApplicants.length})
              </TabsTrigger>
              <TabsTrigger value="invited" className="min-h-[40px]">
                {t("shifts.invitations.invitedTab")}
                {invitations.length > 0 && (
                  <span className="ms-2 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                    {invitations.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingApplicants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("shifts.modal.noPending")}
                </p>
              ) : (
                pendingApplicants.map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    clinicId={clinicId}
                    isUpdating={updatingId === applicant.id}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="accepted" className="space-y-3 mt-4">
              {acceptedApplicants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("shifts.modal.noAccepted")}
                </p>
              ) : (
                acceptedApplicants.map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    clinicId={clinicId}
                    isUpdating={false}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="declined" className="space-y-3 mt-4">
              {declinedApplicants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("shifts.modal.noDeclined")}
                </p>
              ) : (
                declinedApplicants.map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    clinicId={clinicId}
                    isUpdating={false}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="invited" className="space-y-3 mt-4">
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="w-4 h-4 me-2" />
                {t("shifts.invitations.inviteMore")}
              </Button>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("shifts.invitations.noInvitations")}
                </p>
              ) : (
                invitations.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {inv.professional?.full_name}
                      </p>
                      {inv.professional?.specialties?.[0] && (
                        <p className="text-xs text-muted-foreground">
                          {inv.professional.specialties[0]}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        inv.status === "accepted"
                          ? "default"
                          : inv.status === "declined"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {inv.status === "pending"
                        ? t("common.pending")
                        : inv.status === "accepted"
                          ? t("applicant.accepted")
                          : t("applicant.declined")}
                    </Badge>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {shift && (
          <InviteProfessionalsModal
            open={showInviteModal}
            onOpenChange={setShowInviteModal}
            shiftId={shift.id}
            clinicId={clinicId}
            onSuccess={() => void fetchInvitations()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShiftManageModal;

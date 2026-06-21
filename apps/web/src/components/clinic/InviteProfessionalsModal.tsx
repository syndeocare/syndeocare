import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  User,
  Star,
  MapPin,
  Loader2,
  Send,
  Check,
  UserPlus,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { createNotification } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import {
  isGatewayBackendConfigured,
  listLegacyBookings,
  listLegacyProfessionals,
  sendGatewayConversationMessage,
  startGatewayConversation,
} from "@/lib/platform-backend";

interface Professional {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating_avg: number | null;
  specialties: string[] | null;
  location_address: string | null;
  verification_status: string;
  user_id?: string;
  worked_before?: boolean;
}

interface InviteProfessionalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  clinicId: string;
  onSuccess?: () => void;
}

const InviteProfessionalsModal = ({
  open,
  onOpenChange,
  shiftId,
  clinicId,
  onSuccess,
}: InviteProfessionalsModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchExistingInvitations = useCallback(async () => {
    if (isGatewayBackendConfigured()) {
      setInvitedIds(new Set());
      return;
    }

    const { data } = await backendDb
      .from("shift_invitations")
      .select("professional_id")
      .eq("shift_id", shiftId);

    if (data) {
      setInvitedIds(new Set(data.map((inv) => inv.professional_id)));
    }
  }, [shiftId]);

  const fetchProfessionals = useCallback(async () => {
    setLoading(true);
    try {
      if (isGatewayBackendConfigured()) {
        const [items, bookings] = await Promise.all([
          listLegacyProfessionals({ verificationStatus: "approved" }),
          user
            ? listLegacyBookings({
                user,
                userRole: "clinic",
                clinicId,
                onboardingCompleted: true,
                verificationStatus: "verified",
              }).catch(() => [])
            : Promise.resolve([]),
        ]);
        const previouslyWorkedIds = new Set(
          bookings
            .filter((booking) =>
              ["accepted", "confirmed", "completed"].includes(booking.status),
            )
            .map((booking) => booking.professional_id),
        );

        setProfessionals(
          items
            .filter(
              (professional) =>
                professional.verification_status === "verified" &&
                professional.is_available !== false,
            )
            .map((professional) => ({
              id: professional.id,
              full_name: professional.full_name,
              avatar_url: professional.avatar_url,
              rating_avg: professional.rating_avg,
              specialties: professional.specialties,
              location_address: professional.location_address,
              verification_status:
                professional.verification_status ?? "pending",
              worked_before: previouslyWorkedIds.has(professional.id),
            }))
            .sort((a, b) => {
              if (a.worked_before !== b.worked_before) {
                return a.worked_before ? -1 : 1;
              }
              return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
            })
            .slice(0, 75),
        );
        return;
      }

      const { data, error } = await backendDb
        .from("profiles")
        .select(
          "id, full_name, avatar_url, rating_avg, specialties, location_address, verification_status, user_id",
        )
        .eq("verification_status", "verified")
        .eq("is_available", true)
        .order("rating_avg", { ascending: false })
        .limit(50);

      if (error) throw error;
      const { data: workedBookings } = await backendDb
        .from("bookings")
        .select("professional_id, status")
        .eq("clinic_id", clinicId)
        .in("status", ["accepted", "confirmed", "completed"]);
      const previouslyWorkedIds = new Set(
        (workedBookings ?? []).map((booking) => booking.professional_id),
      );

      setProfessionals(
        (data || [])
          .map((professional) => ({
            ...professional,
            worked_before: previouslyWorkedIds.has(professional.id),
          }))
          .sort((a, b) => {
            if (a.worked_before !== b.worked_before) {
              return a.worked_before ? -1 : 1;
            }
            return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
          }),
      );
    } catch (error) {
      console.error("Error fetching professionals:", error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, user]);

  useEffect(() => {
    if (open) {
      void fetchProfessionals();
      void fetchExistingInvitations();
    }
  }, [fetchExistingInvitations, fetchProfessionals, open]);

  const handleInvite = async (professional: Professional) => {
    setInviting(professional.id);
    try {
      if (user && isGatewayBackendConfigured()) {
        const conversation = await startGatewayConversation(
          {
            user,
            userRole: "clinic",
            clinicId,
            onboardingCompleted: true,
            verificationStatus: "verified",
          },
          { clinicId, professionalId: professional.id },
        );
        const content =
          message.trim() ||
          t(
            "shifts.invitations.defaultMessage",
            "You are invited to apply for a new shift. Open the shifts page to review the details.",
          );

        await sendGatewayConversationMessage(
          {
            user,
            userRole: "clinic",
            clinicId,
            onboardingCompleted: true,
            verificationStatus: "verified",
          },
          conversation.id,
          {
            content: `${content}\n\nShift ID: ${shiftId}`,
          },
        );

        setInvitedIds((prev) => new Set([...prev, professional.id]));
        toast({
          title: t("shifts.invitations.sent"),
          description: t("shifts.invitations.sentDesc", {
            name: professional.full_name,
          }),
        });
        onSuccess?.();
        return;
      }

      const { error } = await backendDb.from("shift_invitations").insert({
        shift_id: shiftId,
        clinic_id: clinicId,
        professional_id: professional.id,
        message: message || null,
        status: "pending",
      });

      if (error) throw error;

      if (professional.user_id) {
        await createNotification({
          userId: professional.user_id,
          title: t("shifts.invitations.received"),
          message: t("shifts.invitations.receivedDesc"),
          type: "shift_invitation",
          data: { shift_id: shiftId },
        });
      }

      setInvitedIds((prev) => new Set([...prev, professional.id]));
      toast({
        title: t("shifts.invitations.sent"),
        description: t("shifts.invitations.sentDesc", {
          name: professional.full_name,
        }),
      });
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      setInviting(null);
    }
  };

  const filtered = professionals.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialties?.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t("shifts.invitations.inviteProfessionals")}
          </DialogTitle>
          <DialogDescription>
            {t("shifts.invitations.inviteDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Optional message for all invitations */}
        <Textarea
          placeholder={t("shifts.invitations.messagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="text-sm"
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("shifts.invitations.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Professionals List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>{t("searchProfessionals.noResults")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((pro) => {
                const isInvited = invitedIds.has(pro.id);
                const isCurrentlyInviting = inviting === pro.id;

                return (
                  <div
                    key={pro.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={pro.avatar_url || undefined}
                        alt={pro.full_name}
                      />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {pro.full_name}
                        </p>
                        {pro.rating_avg && pro.rating_avg > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="w-3 h-3 fill-warning text-warning" />
                            {pro.rating_avg.toFixed(1)}
                          </span>
                        )}
                        {pro.worked_before && (
                          <Badge variant="outline" className="text-xs py-0">
                            {t(
                              "shifts.invitations.workedBefore",
                              "Worked before",
                            )}
                          </Badge>
                        )}
                      </div>
                      {pro.specialties && pro.specialties.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {pro.specialties.slice(0, 2).map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs py-0"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {pro.location_address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {pro.location_address}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isInvited ? "outline" : "default"}
                      disabled={isInvited || isCurrentlyInviting}
                      onClick={() => handleInvite(pro)}
                      className="min-h-[36px] shrink-0"
                    >
                      {isCurrentlyInviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isInvited ? (
                        <>
                          <Check className="w-4 h-4 me-1" />
                          {t("shifts.invitations.invited")}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 me-1" />
                          {t("shifts.invitations.invite")}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default InviteProfessionalsModal;

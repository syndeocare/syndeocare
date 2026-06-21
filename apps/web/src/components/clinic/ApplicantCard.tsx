import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Loader2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { StartChatButton } from "@/components/chat/StartChatButton";

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

interface ApplicantCardProps {
  applicant: Applicant;
  clinicId: string;
  isUpdating: boolean;
  onAccept: (bookingId: string) => void;
  onDecline: (bookingId: string) => void;
}

const ApplicantCard = ({
  applicant,
  clinicId,
  isUpdating,
  onAccept,
  onDecline,
}: ApplicantCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { professional } = applicant;

  const getStatusBadge = () => {
    switch (applicant.status) {
      case "accepted":
      case "confirmed":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 me-1" />
            {t("applicant.accepted")}
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 me-1" />
            {t("applicant.declined")}
          </Badge>
        );
      case "requested":
      default:
        return <Badge variant="secondary">{t("applicant.pending")}</Badge>;
    }
  };

  const isPending = applicant.status === "requested";

  return (
    <div
      className="bg-card rounded-lg border border-border p-4 hover:shadow-card transition-shadow"
      role="article"
      aria-label={`${professional.full_name} - ${applicant.status}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Link to={`/professional/${professional.id}`} className="flex-shrink-0">
          <Avatar className="w-12 h-12 hover:ring-2 hover:ring-primary/50 transition-all">
            <AvatarImage
              src={professional.avatar_url || undefined}
              alt={professional.full_name}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {professional.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </Link>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              to={`/professional/${professional.id}`}
              className="font-medium text-foreground truncate hover:text-primary transition-colors"
            >
              {professional.full_name}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 px-2 text-xs"
            >
              <Link to={`/professional/${professional.id}`}>
                <ExternalLink className="w-3 h-3 me-1" />
                {t("viewProfile.viewProfile")}
              </Link>
            </Button>
            {getStatusBadge()}
            {professional.verification_status === "verified" && (
              <Badge
                variant="outline"
                className="text-xs text-success border-success/20"
              >
                <CheckCircle2 className="w-3 h-3 me-1" />
                {t("common.verified")}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
            {professional.rating_avg && professional.rating_avg > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                {professional.rating_avg.toFixed(1)}
              </span>
            )}
            {professional.location_address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {professional.location_address}
              </span>
            )}
          </div>

          {professional.specialties && professional.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {professional.specialties.slice(0, 3).map((spec, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {professional.specialties.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{professional.specialties.length - 3}
                </Badge>
              )}
            </div>
          )}

          {applicant.notes && (
            <div className="mt-3 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {t("applicant.proposal", "Proposal")}
              </p>
              <p className="whitespace-pre-wrap break-words">
                {applicant.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0 items-center">
          {/* Chat button - always visible */}
          <StartChatButton
            targetType="professional"
            targetId={professional.id}
            currentProfileId={clinicId}
            currentUserType="clinic"
            variant="outline"
            size="icon"
            className="h-11 w-11"
          />

          {isPending && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDecline(applicant.id)}
                disabled={isUpdating}
                className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={t("applicant.decline")}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => onAccept(applicant.id)}
                disabled={isUpdating}
                className="h-11 min-w-[100px] bg-success hover:bg-success/90"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 me-1" aria-hidden="true" />
                    {t("applicant.accept")}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantCard;

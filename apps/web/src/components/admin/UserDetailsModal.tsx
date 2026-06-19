import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  Briefcase,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useTranslation } from "react-i18next";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  verification_status: string;
  onboarding_completed: boolean;
  created_at: string;
  specialties: string[] | null;
  qualifications: string[] | null;
  bio?: string;
  location_address?: string;
  hourly_rate?: number;
}

interface Clinic {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  verification_status: string;
  onboarding_completed: boolean;
  created_at: string;
  address: string | null;
  description?: string;
  tax_id?: string;
}

interface Document {
  id: string;
  document_type: string;
  name: string;
  status: string;
  created_at: string;
}

interface UserDetailsModalProps {
  type: "professional" | "clinic";
  user: Profile | Clinic;
  onClose: () => void;
  onVerify: (status: "verified" | "rejected") => void;
}

const UserDetailsModal = ({
  type,
  user,
  onClose,
  onVerify,
}: UserDetailsModalProps) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data } = await backendDb
        .from("documents")
        .select("id, document_type, name, status, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false });

      if (data) setDocuments(data);
      setIsLoading(false);
    };

    fetchDocuments();
  }, [user.user_id]);

  const handleVerify = async (status: "verified" | "rejected") => {
    setIsVerifying(true);
    await onVerify(status);
    setIsVerifying(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("common.verified")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t("common.rejected")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t("common.pending")}</Badge>;
    }
  };

  const isProfessional = type === "professional";
  const profile = user as Profile;
  const clinic = user as Clinic;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isProfessional ? (
              <User className="w-5 h-5 text-primary" />
            ) : (
              <Building2 className="w-5 h-5 text-accent" />
            )}
            {isProfessional ? profile.full_name : clinic.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-lg ${
              user.verification_status === "verified"
                ? "bg-success/10 border border-success/20"
                : user.verification_status === "rejected"
                  ? "bg-destructive/10 border border-destructive/20"
                  : "bg-warning/10 border border-warning/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {t("profile.verificationStatus")}
              </span>
              {getStatusBadge(user.verification_status)}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-secondary rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">
              {t("onboarding.basicInfo")}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{user.phone}</span>
                </div>
              )}
              {(isProfessional ? profile.location_address : clinic.address) && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {isProfessional ? profile.location_address : clinic.address}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("profile.joinedOn", {
                    date: new Date(user.created_at).toLocaleDateString(),
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Professional-specific info */}
          {isProfessional && (
            <>
              {profile.bio && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">
                    {t("profile.bio")}
                  </h4>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {profile.hourly_rate && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">
                    {t("profile.hourlyRate")}
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    ${profile.hourly_rate}/hr
                  </p>
                </div>
              )}

              {profile.specialties && profile.specialties.length > 0 && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {t("profile.specialties")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((specialty, i) => (
                      <Badge key={i} variant="outline" className="bg-primary/5">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.qualifications && profile.qualifications.length > 0 && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-3">
                    {t("profile.qualifications")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.qualifications.map((qual, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-success/5 text-success border-success/20"
                      >
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Clinic-specific info */}
          {!isProfessional && (
            <>
              {clinic.description && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">
                    {t("onboarding.fields.description")}
                  </h4>
                  <p className="text-muted-foreground">{clinic.description}</p>
                </div>
              )}

              {clinic.tax_id && (
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">
                    {t("onboarding.fields.taxId")}
                  </h4>
                  <p className="text-foreground font-mono">{clinic.tax_id}</p>
                </div>
              )}
            </>
          )}

          {/* Documents */}
          <div className="bg-secondary rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("profile.documents")}
            </h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background"
                  >
                    <div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {(doc.document_type ?? "").replace(/_/g, " ")}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {t("admin.noDocumentsFound")}
              </p>
            )}
          </div>

          {/* Actions */}
          {user.verification_status === "pending" && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleVerify("rejected")}
                disabled={isVerifying}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t("common.reject")}
              </Button>
              <Button
                className="flex-1 bg-success hover:bg-success/90"
                onClick={() => handleVerify("verified")}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t("common.approve")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;

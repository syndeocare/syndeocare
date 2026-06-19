import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Save,
  X,
  Upload,
  Loader2,
  Camera,
  ArrowLeft,
  Shield,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import DocumentUploadCard from "@/components/onboarding/DocumentUploadCard";
import TaxonomyPicker from "@/components/onboarding/TaxonomyPicker";
import { useTranslation } from "react-i18next";
import { uploadAvatarToStorage, uploadDocumentToStorage } from "@/lib/storage";
import {
  getGatewayOnboardingStatus,
  getCurrentProfessionalProfile,
  isGatewayBackendConfigured,
  updateCurrentProfessionalProfile,
} from "@/lib/platform-backend";
import { gatewayDocumentTypeMatches } from "@/lib/document-types";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  location_address: string | null;
  hourly_rate: number | null;
  specialties: string[] | null;
  qualifications: string[] | null;
  verification_status: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  location_lat: number | null;
  location_lng: number | null;
}

interface Document {
  id: string;
  document_type_id?: string | null;
  document_type: string;
  name: string;
  file_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface DocumentUpload {
  docType: {
    id: string;
    name: string;
    name_ar: string | null;
    description: string | null;
    is_required: boolean;
    allowed_extensions: string[] | null;
    max_size_mb: number | null;
  };
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  status?: "pending" | "verified" | "rejected";
  rejectionReason?: string;
  documentId?: string | null;
}

interface GatewayUploadedDocumentRow {
  documentType: string;
  uploadedAt: string;
}

const AVATAR_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

const trimToNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed || null;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getLatestDocumentForType = (
  docs: Document[],
  docType: DocumentUpload["docType"],
) => {
  const matches = docs.filter(
    (doc) =>
      doc.document_type_id === docType.id ||
      doc.name === docType.name ||
      doc.document_type === docType.name,
  );

  return matches.sort((a, b) => {
    const aDate = new Date(a.created_at ?? 0).getTime();
    const bDate = new Date(b.created_at ?? 0).getTime();
    return bDate - aDate;
  })[0];
};

const getLatestGatewayDocumentForType = (
  docs: GatewayUploadedDocumentRow[],
  docType: DocumentUpload["docType"],
) => {
  const matches = docs.filter((doc) =>
    gatewayDocumentTypeMatches(doc.documentType, docType),
  );

  return matches.sort((a, b) => {
    const aDate = new Date(a.uploadedAt).getTime();
    const bDate = new Date(b.uploadedAt).getTime();
    return bDate - aDate;
  })[0];
};

const mapGatewayDocumentStatus = (
  status: "not_started" | "pending_review" | "approved" | "rejected",
  isOutstanding = false,
): "pending" | "verified" | "rejected" => {
  switch (status) {
    case "approved":
      return "verified";
    case "rejected":
      return isOutstanding ? "rejected" : "verified";
    default:
      return "pending";
  }
};

const ProfessionalProfile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "profile",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location_address: "",
    hourly_rate: "",
    specialties: [] as string[],
    qualifications: [] as string[],
  });

  const [documentUploads, setDocumentUploads] = useState<DocumentUpload[]>([]);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    try {
      const [{ data: profileData }, { data: docTypesData }] = await Promise.all(
        [
          backendDb
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single(),
          backendDb
            .from("document_types")
            .select(
              "id, name, name_ar, description, is_required, allowed_extensions, max_size_mb",
            )
            .eq("is_active", true)
            .in("applies_to", ["professional", "both"])
            .order("display_order", { ascending: true }),
        ],
      );

      let mergedProfile: Profile | null = profileData;
      let gatewayOnboarding: Awaited<
        ReturnType<typeof getGatewayOnboardingStatus>
      > | null = null;

      if (isGatewayBackendConfigured()) {
        try {
          const gatewayProfile = await getCurrentProfessionalProfile({
            user,
            userRole: "professional",
            profileId: profileData?.id,
            verificationStatus:
              profileData?.verification_status === "verified"
                ? "verified"
                : profileData?.verification_status === "rejected"
                  ? "rejected"
                  : "pending",
            onboardingCompleted: profileData?.onboarding_completed ?? undefined,
            displayName: profileData?.full_name ?? user.email ?? undefined,
          });

          mergedProfile = profileData
            ? {
                ...profileData,
                avatar_url:
                  gatewayProfile.profileImageUrl ?? profileData.avatar_url,
                full_name: gatewayProfile.full_name,
                bio: gatewayProfile.bio,
                phone: gatewayProfile.phone ?? profileData.phone,
                specialties:
                  gatewayProfile.specialties ?? profileData.specialties,
                qualifications:
                  gatewayProfile.qualifications ?? profileData.qualifications,
                verification_status: gatewayProfile.verification_status,
                location_address:
                  gatewayProfile.location_address ??
                  profileData.location_address,
                onboarding_completed:
                  gatewayProfile.onboarding_completed ??
                  profileData.onboarding_completed,
              }
            : {
                id: gatewayProfile.id,
                user_id: user.id,
                full_name: gatewayProfile.full_name,
                email: user.email ?? "",
                phone: gatewayProfile.phone ?? null,
                bio: gatewayProfile.bio,
                location_address: gatewayProfile.location_address,
                hourly_rate: gatewayProfile.hourly_rate ?? null,
                specialties: gatewayProfile.specialties ?? [],
                qualifications: gatewayProfile.qualifications ?? [],
                verification_status: gatewayProfile.verification_status,
                avatar_url: gatewayProfile.profileImageUrl ?? null,
                onboarding_completed:
                  gatewayProfile.onboarding_completed ?? false,
                location_lat: null,
                location_lng: null,
              };
          gatewayOnboarding = await getGatewayOnboardingStatus({
            user,
            userRole: "professional",
          });
        } catch (error) {
          console.warn(
            "Falling back to BackendDb professional profile fetch",
            error,
          );
        }
      }

      if (mergedProfile) {
        setProfile(mergedProfile);
        setFormData({
          full_name: mergedProfile.full_name || "",
          phone: mergedProfile.phone || "",
          bio: mergedProfile.bio || "",
          location_address: mergedProfile.location_address || "",
          hourly_rate: mergedProfile.hourly_rate?.toString() || "",
          specialties: mergedProfile.specialties || [],
          qualifications: mergedProfile.qualifications || [],
        });
      }

      if (docTypesData && gatewayOnboarding) {
        setDocumentUploads(
          docTypesData.map((docType) => {
            const existing = getLatestGatewayDocumentForType(
              gatewayOnboarding?.uploadedDocuments ?? [],
              docType,
            );
            const isOutstanding = gatewayOnboarding.missingDocuments.some(
              (documentType) =>
                gatewayDocumentTypeMatches(documentType, docType),
            );
            const status = existing
              ? mapGatewayDocumentStatus(
                  gatewayOnboarding.verificationStatus,
                  isOutstanding,
                )
              : "pending";

            return {
              docType,
              file: null,
              uploading: false,
              uploaded: !!existing,
              status,
              rejectionReason:
                status === "rejected"
                  ? gatewayOnboarding.nextAction
                  : undefined,
              documentId: null,
            };
          }),
        );
      } else if (docTypesData) {
        const { data: docsData } = await backendDb
          .from("documents")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setDocumentUploads(
          docTypesData.map((docType) => {
            const existing = getLatestDocumentForType(docsData ?? [], docType);
            return {
              docType,
              file: null,
              uploading: false,
              uploaded: !!existing,
              status:
                (existing?.status as
                  | "pending"
                  | "verified"
                  | "rejected"
                  | undefined) ?? "pending",
              rejectionReason: existing?.rejection_reason ?? undefined,
              documentId: existing?.id ?? null,
            };
          }),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== "professional")) {
      navigate("/auth");
      return;
    }

    fetchProfileData();
  }, [user, userRole, authLoading, navigate, fetchProfileData]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      let savedViaGateway = false;

      if (isGatewayBackendConfigured()) {
        try {
          await updateCurrentProfessionalProfile(
            {
              user,
              userRole: "professional",
              profileId: profile.id,
              verificationStatus:
                profile.verification_status === "verified"
                  ? "verified"
                  : profile.verification_status === "rejected"
                    ? "rejected"
                    : "pending",
              onboardingCompleted: profile.onboarding_completed,
              displayName: formData.full_name.trim() || profile.full_name,
            },
            {
              fullName: formData.full_name,
              bio: formData.bio,
              primaryPhone: formData.phone,
              specialties: formData.specialties,
              qualifications: formData.qualifications,
              locationAddress: formData.location_address,
              locationLat: profile.location_lat,
              locationLng: profile.location_lng,
            },
          );
          savedViaGateway = true;
        } catch (error) {
          console.warn(
            "Falling back to BackendDb professional profile save",
            error,
          );
        }
      }

      if (!savedViaGateway) {
        const { error } = await backendDb
          .from("profiles")
          .update({
            full_name: formData.full_name.trim(),
            phone: trimToNullable(formData.phone),
            bio: trimToNullable(formData.bio),
            location_address: trimToNullable(formData.location_address),
            hourly_rate: formData.hourly_rate
              ? parseFloat(formData.hourly_rate)
              : null,
            specialties: formData.specialties,
            qualifications: formData.qualifications,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      toast({
        title: t("profile.profileUpdated"),
        description: t("profile.profileUpdatedDesc"),
      });

      setIsEditing(false);
      await fetchProfileData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getErrorMessage(error, t("common.error")),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const upload = await uploadAvatarToStorage(file, "avatar");

      if (upload.backend === "legacy") {
        const { error: updateError } = await backendDb
          .from("profiles")
          .update({ avatar_url: upload.url })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: t("profile.photoUploaded"),
        description: t("profile.photoUploadedDesc"),
      });

      await fetchProfileData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("documents.uploadFailed"),
        description: getErrorMessage(error, t("documents.uploadFailed")),
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleFileSelect = (index: number, file: File) => {
    setDocumentUploads((prev) => {
      const next = [...prev];
      if (next[index].uploaded && next[index].status !== "rejected") {
        return prev;
      }
      next[index] = { ...next[index], file, uploaded: false };
      return next;
    });
  };

  const uploadDocument = async (index: number) => {
    const doc = documentUploads[index];
    if (!doc.file || !user) return;
    if (doc.uploaded && doc.status !== "rejected") return;

    const newDocs = [...documentUploads];
    newDocs[index] = { ...newDocs[index], uploading: true };
    setDocumentUploads(newDocs);

    try {
      if (isGatewayBackendConfigured()) {
        const upload = await uploadDocumentToStorage(
          doc.file,
          doc.docType.name,
        );

        if (upload.backend === "legacy") {
          const { fileUrl } = upload;

          if (doc.documentId) {
            const { error: dbError } = await backendDb
              .from("documents")
              .update({
                file_url: fileUrl,
                status: "pending",
                rejection_reason: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", doc.documentId);

            if (dbError) throw dbError;
          } else {
            const { data: inserted, error: dbError } = await backendDb
              .from("documents")
              .insert({
                user_id: user.id,
                document_type_id: doc.docType.id,
                document_type: doc.docType.name,
                name: doc.docType.name,
                file_url: fileUrl,
                status: "pending",
              })
              .select("id")
              .single();

            if (dbError) throw dbError;
            newDocs[index] = { ...newDocs[index], documentId: inserted.id };
          }
        }
      } else {
        const { fileUrl } = await uploadDocumentToStorage(
          doc.file,
          doc.docType.id,
        );

        if (doc.documentId) {
          const { error: dbError } = await backendDb
            .from("documents")
            .update({
              file_url: fileUrl,
              status: "pending",
              rejection_reason: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", doc.documentId);

          if (dbError) throw dbError;
        } else {
          const { data: inserted, error: dbError } = await backendDb
            .from("documents")
            .insert({
              user_id: user.id,
              document_type_id: doc.docType.id,
              document_type: doc.docType.name,
              name: doc.docType.name,
              file_url: fileUrl,
              status: "pending",
            })
            .select("id")
            .single();

          if (dbError) throw dbError;
          newDocs[index] = { ...newDocs[index], documentId: inserted.id };
        }
      }

      newDocs[index] = {
        ...newDocs[index],
        uploading: false,
        uploaded: true,
        status: "pending",
        file: null,
      };
      setDocumentUploads(newDocs);

      toast({
        title: t("documents.documentUploaded"),
        description: t("documents.documentUploadedDesc", {
          name: doc.docType.name,
        }),
      });

      await fetchProfileData();
    } catch (error) {
      newDocs[index] = { ...newDocs[index], uploading: false };
      setDocumentUploads(newDocs);
      toast({
        variant: "destructive",
        title: t("documents.uploadFailed"),
        description: getErrorMessage(error, t("documents.uploadFailed")),
      });
    }
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
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {t("common.pending")}
          </Badge>
        );
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const verifiedDocs = documentUploads.filter(
    (d) => d.status === "verified",
  ).length;
  const pendingDocs = documentUploads.filter(
    (d) => d.status === "pending",
  ).length;
  const totalDocs = documentUploads.filter((d) => d.uploaded).length;

  return (
    <>
      <input
        ref={avatarInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={handleAvatarUpload}
      />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back button */}
        <Link
          to="/dashboard/professional"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("nav.backToDashboard")}
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-card mb-6"
        >
          <div className="flex items-start gap-6 flex-wrap">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24 rounded-2xl">
                <AvatarImage
                  src={profile?.avatar_url || undefined}
                  alt={profile?.full_name || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="w-24 h-24 rounded-2xl gradient-primary text-primary-foreground text-2xl font-semibold">
                  {profile?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "PR"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile?.full_name || "Your Name"}
                </h1>
                {getStatusBadge(profile?.verification_status || "pending")}
              </div>
              <p className="text-muted-foreground mb-3">{profile?.email}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile?.location_address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location_address}
                  </span>
                )}
                {profile?.hourly_rate && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />${profile.hourly_rate}/hr
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {totalDocs}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("profile.documents")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">
                  {verifiedDocs}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("common.verified")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{pendingDocs}</p>
                <p className="text-xs text-muted-foreground">
                  {t("common.pending")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Verification Alert */}
        {profile?.verification_status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/20"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-warning" />
              <div>
                <h3 className="font-medium text-foreground">
                  {t("profile.verificationPending")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("profile.verificationPendingDesc")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              {t("profile.tabs.profile")}
            </TabsTrigger>
            <TabsTrigger value="qualifications">
              {t("profile.tabs.qualifications")}
            </TabsTrigger>
            <TabsTrigger value="documents">
              {t("profile.tabs.documents")}
              {pendingDocs > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-warning text-warning-foreground rounded-full">
                  {pendingDocs}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("profile.personalInfo")}
                </h2>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          ...formData,
                          full_name: profile?.full_name || "",
                          phone: profile?.phone || "",
                          bio: profile?.bio || "",
                          location_address: profile?.location_address || "",
                          hourly_rate: profile?.hourly_rate?.toString() || "",
                        });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("common.save")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t("auth.fullName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            full_name: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.phone")}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">{t("profile.location")}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="location"
                        value={formData.location_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location_address: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">
                      {t("profile.hourlyRate")}
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="hourly_rate"
                        type="number"
                        value={formData.hourly_rate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hourly_rate: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">{t("profile.bio")}</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    disabled={!isEditing}
                    rows={4}
                    placeholder={t("onboarding.fields.bioPlaceholder")}
                  />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Qualifications Tab */}
          <TabsContent value="qualifications">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("profile.professionalInfo")}
                </h2>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          ...formData,
                          specialties: profile?.specialties || [],
                          qualifications: profile?.qualifications || [],
                        });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("common.save")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Specialties */}
                <div className="space-y-3">
                  <Label>{t("profile.specialties")}</Label>
                  {isEditing && (
                    <TaxonomyPicker
                      table="specialties"
                      value={formData.specialties}
                      onChange={(specialties) =>
                        setFormData({ ...formData, specialties })
                      }
                      searchPlaceholder={t("admin.config.searchSpecialties")}
                      emptyMessage={t("admin.config.noSpecialtiesFound")}
                      allowCustom={false}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                    {formData.specialties.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        {t("common.noData")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Qualifications */}
                <div className="space-y-3">
                  <Label>{t("profile.qualifications")}</Label>
                  {isEditing && (
                    <TaxonomyPicker
                      table="certifications"
                      value={formData.qualifications}
                      onChange={(qualifications) =>
                        setFormData({ ...formData, qualifications })
                      }
                      searchPlaceholder={t("admin.config.searchCerts")}
                      emptyMessage={t("admin.config.noCertsFound")}
                      allowCustom={false}
                      variant="secondary"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.qualifications.map((qual, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-foreground text-sm"
                      >
                        {qual}
                      </span>
                    ))}
                    {formData.qualifications.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        {t("common.noData")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("profile.documents")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("documents.pendingVerification")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {documentUploads.map((doc, index) => (
                  <DocumentUploadCard
                    key={doc.docType.id}
                    type={doc.docType.id}
                    name={
                      doc.docType.name_ar
                        ? `${doc.docType.name} / ${doc.docType.name_ar}`
                        : doc.docType.name
                    }
                    description={
                      doc.docType.description ||
                      t("documents.pendingVerification")
                    }
                    required={doc.docType.is_required}
                    file={doc.file}
                    uploading={doc.uploading}
                    uploaded={doc.uploaded}
                    status={doc.status}
                    rejectionReason={doc.rejectionReason}
                    allowedExtensions={
                      doc.docType.allowed_extensions || undefined
                    }
                    maxSizeMb={doc.docType.max_size_mb || undefined}
                    locked={doc.uploaded && doc.status !== "rejected"}
                    onFileSelect={(file) => handleFileSelect(index, file)}
                    onUpload={() => uploadDocument(index)}
                    onRemove={() => {
                      const newDocs = [...documentUploads];
                      newDocs[index] = { ...newDocs[index], file: null };
                      setDocumentUploads(newDocs);
                    }}
                  />
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-secondary">
                <p className="text-sm text-muted-foreground">
                  <strong>{t("common.note")}:</strong>{" "}
                  {t("profile.documentsNote")}
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ProfessionalProfile;

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
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Save,
  X,
  Loader2,
  Camera,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { backendDb } from "@/integrations/backend/client";
import type { Json } from "@/integrations/backend/types";
import { useToast } from "@/hooks/use-toast";
import DocumentUploadCard from "@/components/onboarding/DocumentUploadCard";
import { useTranslation } from "react-i18next";
import { uploadAvatarToStorage, uploadDocumentToStorage } from "@/lib/storage";
import {
  getGatewayOnboardingStatus,
  getCurrentClinicProfile,
  isGatewayBackendConfigured,
  updateCurrentClinicProfile,
} from "@/lib/platform-backend";
import { gatewayDocumentTypeMatches } from "@/lib/document-types";

type ClinicSettings = {
  website?: string | null;
};

interface Clinic {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  description: string | null;
  address: string | null;
  tax_id: string | null;
  verification_status: string;
  logo_url: string | null;
  onboarding_completed: boolean;
  settings: Json | ClinicSettings | null;
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

const getClinicWebsite = (settings: Clinic["settings"]) =>
  settings && typeof settings === "object" && !Array.isArray(settings)
    ? "website" in settings && typeof settings.website === "string"
      ? settings.website
      : ""
    : "";

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

const ClinicProfile = () => {
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
    address: "",
    tax_id: "",
    website: "",
  });

  const [documentUploads, setDocumentUploads] = useState<DocumentUpload[]>([]);

  const fetchClinicData = useCallback(async () => {
    if (!user) return;

    try {
      const [{ data: clinicData }, { data: docTypesData }] = await Promise.all([
        backendDb.from("clinics").select("*").eq("user_id", user.id).single(),
        backendDb
          .from("document_types")
          .select(
            "id, name, name_ar, description, is_required, allowed_extensions, max_size_mb",
          )
          .eq("is_active", true)
          .in("applies_to", ["clinic", "both"])
          .order("display_order", { ascending: true }),
      ]);

      let mergedClinic: Clinic | null = clinicData;
      let gatewayOnboarding: Awaited<
        ReturnType<typeof getGatewayOnboardingStatus>
      > | null = null;

      if (isGatewayBackendConfigured()) {
        try {
          const gatewayClinic = await getCurrentClinicProfile({
            user,
            userRole: "clinic",
            clinicId: clinicData?.id,
            verificationStatus:
              clinicData?.verification_status === "verified"
                ? "verified"
                : clinicData?.verification_status === "rejected"
                  ? "rejected"
                  : "pending",
            onboardingCompleted: clinicData?.onboarding_completed ?? undefined,
            displayName: clinicData?.name ?? user.email ?? undefined,
          });

          mergedClinic = clinicData
            ? {
                ...clinicData,
                logo_url: gatewayClinic.logo_url ?? clinicData.logo_url,
                name: gatewayClinic.name,
                phone: gatewayClinic.phone ?? clinicData.phone,
                description:
                  gatewayClinic.description ?? clinicData.description,
                address: gatewayClinic.address ?? clinicData.address,
                verification_status: gatewayClinic.verification_status,
                onboarding_completed:
                  gatewayClinic.onboarding_completed ??
                  clinicData.onboarding_completed,
              }
            : {
                id: gatewayClinic.id,
                user_id: user.id,
                name: gatewayClinic.name,
                email: user.email ?? "",
                phone: gatewayClinic.phone ?? null,
                description: gatewayClinic.description ?? null,
                address: gatewayClinic.address ?? null,
                tax_id: null,
                verification_status: gatewayClinic.verification_status,
                logo_url: gatewayClinic.logo_url ?? null,
                onboarding_completed:
                  gatewayClinic.onboarding_completed ?? false,
                settings: {
                  website: gatewayClinic.settings?.website ?? null,
                },
                location_lat: null,
                location_lng: null,
              };
          gatewayOnboarding = await getGatewayOnboardingStatus({
            user,
            userRole: "clinic",
          });
        } catch (error) {
          console.warn("Falling back to BackendDb clinic profile fetch", error);
        }
      }

      if (mergedClinic) {
        setClinic(mergedClinic);
        setFormData({
          name: mergedClinic.name || "",
          email: mergedClinic.email || "",
          phone: mergedClinic.phone || "",
          description: mergedClinic.description || "",
          address: mergedClinic.address || "",
          tax_id: mergedClinic.tax_id || "",
          website: getClinicWebsite(mergedClinic.settings),
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
    if (!authLoading && (!user || userRole !== "clinic")) {
      navigate("/auth");
      return;
    }

    fetchClinicData();
  }, [user, userRole, authLoading, navigate, fetchClinicData]);

  const handleSaveClinic = async () => {
    if (!user || !clinic) return;

    setIsSaving(true);
    try {
      let savedViaGateway = false;

      if (isGatewayBackendConfigured()) {
        try {
          await updateCurrentClinicProfile(
            {
              user,
              userRole: "clinic",
              clinicId: clinic.id,
              verificationStatus:
                clinic.verification_status === "verified"
                  ? "verified"
                  : clinic.verification_status === "rejected"
                    ? "rejected"
                    : "pending",
              onboardingCompleted: clinic.onboarding_completed,
              displayName: formData.name.trim() || clinic.name,
            },
            {
              organizationName: formData.name,
              description: formData.description,
              contactPhone: formData.phone,
              websiteUrl: formData.website,
              address: formData.address,
              locationLat: clinic.location_lat,
              locationLng: clinic.location_lng,
            },
          );
          savedViaGateway = true;
        } catch (error) {
          console.warn("Falling back to BackendDb clinic profile save", error);
        }
      }

      if (!savedViaGateway) {
        const { error } = await backendDb
          .from("clinics")
          .update({
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: trimToNullable(formData.phone),
            description: trimToNullable(formData.description),
            address: trimToNullable(formData.address),
            tax_id: trimToNullable(formData.tax_id),
            settings: { website: trimToNullable(formData.website) },
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      toast({
        title: t("profile.clinicUpdated"),
        description: t("profile.clinicUpdatedDesc"),
      });

      setIsEditing(false);
      await fetchClinicData();
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

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingLogo(true);
    try {
      const upload = await uploadAvatarToStorage(file, "logo");

      if (upload.backend === "legacy") {
        const { error: updateError } = await backendDb
          .from("clinics")
          .update({ logo_url: upload.url })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: t("profile.photoUploaded"),
        description: t("profile.photoUploadedDesc"),
      });

      await fetchClinicData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("documents.uploadFailed"),
        description: getErrorMessage(error, t("documents.uploadFailed")),
      });
    } finally {
      setIsUploadingLogo(false);
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

      await fetchClinicData();
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
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
        onChange={handleLogoUpload}
      />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back button */}
        <Link
          to="/dashboard/clinic"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("nav.backToDashboard")}
        </Link>

        {/* Clinic Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-card mb-6"
        >
          <div className="flex items-start gap-6 flex-wrap">
            {/* Logo */}
            <div className="relative">
              <Avatar className="w-24 h-24 rounded-2xl">
                <AvatarImage
                  src={clinic?.logo_url || undefined}
                  alt={clinic?.name || "Clinic"}
                  className="object-cover"
                />
                <AvatarFallback className="w-24 h-24 rounded-2xl gradient-accent text-accent-foreground text-2xl font-semibold">
                  {clinic?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "CL"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {isUploadingLogo ? (
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
                  {clinic?.name || "Your Clinic"}
                </h1>
                {getStatusBadge(clinic?.verification_status || "pending")}
              </div>
              <p className="text-muted-foreground mb-3">{clinic?.email}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {clinic?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {clinic.address}
                  </span>
                )}
                {formData.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {formData.website}
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
        {clinic?.verification_status === "pending" && (
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              {t("profile.tabs.clinicDetails")}
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
                  {t("profile.organizationInfo")}
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
                          name: clinic?.name || "",
                          email: clinic?.email || "",
                          phone: clinic?.phone || "",
                          description: clinic?.description || "",
                          address: clinic?.address || "",
                          tax_id: clinic?.tax_id || "",
                          website: getClinicWebsite(clinic?.settings ?? null),
                        });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveClinic}
                      disabled={isSaving}
                      className="bg-accent hover:bg-accent/90"
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
                <div className="space-y-2">
                  <Label htmlFor="name">{t("onboarding.fields.orgName")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
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
                    <Label htmlFor="tax_id">
                      {t("onboarding.fields.taxId")}
                    </Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) =>
                        setFormData({ ...formData, tax_id: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">
                      {t("onboarding.fields.website")}
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) =>
                          setFormData({ ...formData, website: e.target.value })
                        }
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">{t("profile.address")}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      disabled={!isEditing}
                      className="pl-10 min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("onboarding.fields.description")}
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    disabled={!isEditing}
                    rows={4}
                    placeholder={t("onboarding.fields.descriptionPlaceholder")}
                  />
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

export default ClinicProfile;

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Globe,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import DocumentUploadCard from "@/components/onboarding/DocumentUploadCard";
import AvatarUpload from "@/components/onboarding/AvatarUpload";
import LocationPicker from "@/components/location/LocationPicker";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import BrandLogo from "@/components/brand/BrandLogo";
import { uploadDocumentToStorage } from "@/lib/storage";
import type { AvatarUploadResult } from "@/lib/storage";
import {
  getGatewayOnboardingStatus,
  isGatewayBackendConfigured,
  updateCurrentClinicProfile,
  updateGatewayOnboardingStatus,
} from "@/lib/platform-backend";
import {
  gatewayDocumentTypeMatches,
  getGatewayDocumentTypeKey,
} from "@/lib/document-types";
import {
  formatYemeniPhone,
  isValidYemeniMobile,
  normalizeYemeniPhoneInput,
} from "@/lib/yemen-phone";

type Step = "organization" | "location" | "documents" | "complete";

interface DocTypeRow {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  is_required: boolean;
  allowed_extensions: string[] | null;
  max_size_mb: number | null;
}

interface DocumentSlot {
  docType: DocTypeRow;
  existingId: string | null;
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  status?: "pending" | "verified" | "rejected";
  rejectionReason?: string;
}

interface ExistingDocumentRow {
  id: string;
  document_type_id: string | null;
  name: string | null;
  status: "pending" | "verified" | "rejected" | null;
  rejection_reason: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface GatewayUploadedDocumentRow {
  documentType: string;
  uploadedAt: string;
}

type OnboardingAuthUser = {
  email?: string;
  user_metadata?: Record<string, unknown>;
};

const getUserMetadataString = (
  user: OnboardingAuthUser | null,
  keys: string[],
) => {
  for (const key of keys) {
    const value = user?.user_metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getOrganizationDisplayName = (user: OnboardingAuthUser | null) =>
  getUserMetadataString(user, [
    "organizationName",
    "organization_name",
    "full_name",
    "display_name",
    "name",
  ]) ||
  user?.email?.split("@")[0] ||
  "";

const getUserAvatarUrl = (user: OnboardingAuthUser | null) =>
  getUserMetadataString(user, ["avatar_url", "picture"]);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const throwLegacySyncErrorIfRequired = (
  error: { message: string } | null,
  scope: string,
) => {
  if (!error) {
    return;
  }

  if (isGatewayBackendConfigured()) {
    console.warn(
      `Ignoring legacy clinic onboarding ${scope} sync failure`,
      error,
    );
    return;
  }

  throw error;
};

const getLatestDocumentForType = (
  docs: ExistingDocumentRow[],
  docType: DocTypeRow,
) => {
  const matches = docs.filter(
    (doc) =>
      doc.document_type_id === docType.id ||
      (doc.name && doc.name === docType.name),
  );

  return matches.sort((a, b) => {
    const aDate = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const bDate = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return bDate - aDate;
  })[0];
};

const getLatestGatewayDocumentForType = (
  docs: GatewayUploadedDocumentRow[],
  docType: DocTypeRow,
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

const ClinicOnboarding = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const {
    user,
    userRole,
    isLoading: authLoading,
    refreshOnboardingStatus,
  } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<Step>("organization");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [orgData, setOrgData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
    tax_id: "",
  });

  const [locationData, setLocationData] = useState({
    address: "",
    location_lat: null as number | null,
    location_lng: null as number | null,
    website: "",
  });

  const [documents, setDocuments] = useState<DocumentSlot[]>([]);

  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    {
      key: "organization",
      label: t("onboarding.steps.organization"),
      icon: Building2,
    },
    { key: "location", label: t("onboarding.steps.location"), icon: MapPin },
    {
      key: "documents",
      label: t("onboarding.steps.documents"),
      icon: FileText,
    },
    {
      key: "complete",
      label: t("onboarding.steps.complete"),
      icon: CheckCircle2,
    },
  ];

  useEffect(() => {
    if (!authLoading && (!user || userRole !== "clinic")) {
      navigate("/auth");
      return;
    }

    const fetchClinic = async () => {
      if (!user) return;
      const fallbackName = getOrganizationDisplayName(user);
      const fallbackEmail = user.email ?? "";
      const fallbackLogoUrl = getUserAvatarUrl(user);

      if (fallbackName || fallbackEmail) {
        setOrgData((current) => ({
          ...current,
          name: current.name.trim() || fallbackName,
          email: current.email.trim() || fallbackEmail,
        }));
      }

      if (fallbackLogoUrl) {
        setLogoUrl((current) => current ?? fallbackLogoUrl);
      }

      const { data } = await backendDb
        .from("clinics")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setClinicId(data.id);
        setLogoUrl(data.logo_url || fallbackLogoUrl || null);
        setOrgData({
          name: data.name || fallbackName,
          email: data.email || fallbackEmail,
          phone: data.phone || "",
          description: data.description || "",
          tax_id: data.tax_id || "",
        });
        setLocationData({
          address: data.address || "",
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          website:
            typeof data.settings === "object" &&
            data.settings !== null &&
            "website" in data.settings &&
            typeof data.settings.website === "string"
              ? data.settings.website
              : "",
        });

        if (data.onboarding_completed) {
          navigate("/dashboard/clinic");
        }
      }

      let gatewayOnboarding: Awaited<
        ReturnType<typeof getGatewayOnboardingStatus>
      > | null = null;

      if (isGatewayBackendConfigured()) {
        try {
          gatewayOnboarding = await getGatewayOnboardingStatus({
            user,
            userRole: "clinic",
          });
        } catch (error) {
          console.warn(
            "Falling back to legacy onboarding documents for clinics",
            error,
          );
        }
      }

      // Fetch active document types for clinics
      const { data: docTypes } = await backendDb
        .from("document_types")
        .select(
          "id, name, name_ar, description, is_required, allowed_extensions, max_size_mb",
        )
        .eq("is_active", true)
        .in("applies_to", ["clinic", "both"])
        .order("display_order", { ascending: true });

      if (docTypes && gatewayOnboarding) {
        setDocuments(
          (docTypes as DocTypeRow[]).map((dt) => {
            const existing = getLatestGatewayDocumentForType(
              gatewayOnboarding.uploadedDocuments ?? [],
              dt,
            );
            const isOutstanding = gatewayOnboarding.missingDocuments.some(
              (documentType) => gatewayDocumentTypeMatches(documentType, dt),
            );
            const status = existing
              ? mapGatewayDocumentStatus(
                  gatewayOnboarding.verificationStatus,
                  isOutstanding,
                )
              : "pending";

            return {
              docType: dt,
              existingId: null,
              file: null,
              uploading: false,
              uploaded: !!existing,
              status,
              rejectionReason:
                status === "rejected"
                  ? gatewayOnboarding.nextAction
                  : undefined,
            };
          }),
        );
        return;
      }

      const { data: docs } = await backendDb
        .from("documents")
        .select(
          "id, document_type_id, name, status, rejection_reason, updated_at, created_at",
        )
        .eq("user_id", user.id);

      if (docTypes) {
        setDocuments(
          (docTypes as DocTypeRow[]).map((dt) => {
            const existing = getLatestDocumentForType(
              (docs as ExistingDocumentRow[] | null) ?? [],
              dt,
            );
            return {
              docType: dt,
              existingId: existing?.id ?? null,
              file: null,
              uploading: false,
              uploaded: !!existing,
              status: existing?.status ?? "pending",
              rejectionReason: existing?.rejection_reason ?? undefined,
            };
          }),
        );
      }
    };

    fetchClinic();
  }, [user, userRole, authLoading, navigate]);

  const handleFileSelect = (index: number, file: File) => {
    setDocuments((prev) => {
      const next = [...prev];
      if (next[index].uploaded && next[index].status !== "rejected") {
        return prev;
      }
      next[index] = { ...next[index], file, uploaded: false };
      return next;
    });
  };

  const uploadDocument = async (index: number) => {
    const slot = documents[index];
    if (!slot.file || !user) return;
    if (slot.uploaded && slot.status !== "rejected") {
      return;
    }

    setDocuments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], uploading: true };
      return next;
    });

    try {
      if (isGatewayBackendConfigured()) {
        const upload = await uploadDocumentToStorage(
          slot.file,
          getGatewayDocumentTypeKey(slot.docType),
        );

        if (upload.backend === "legacy") {
          const { fileUrl } = upload;

          if (slot.existingId) {
            const { error: dbError } = await backendDb
              .from("documents")
              .update({
                file_url: fileUrl,
                status: "pending",
                rejection_reason: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", slot.existingId);
            if (dbError) throw dbError;
          } else {
            const { data: inserted, error: dbError } = await backendDb
              .from("documents")
              .insert({
                user_id: user.id,
                document_type_id: slot.docType.id,
                name: slot.docType.name,
                file_url: fileUrl,
                status: "pending",
              })
              .select("id")
              .single();
            if (dbError) throw dbError;
            setDocuments((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], existingId: inserted!.id };
              return next;
            });
          }
        }
      } else {
        const { fileUrl } = await uploadDocumentToStorage(
          slot.file,
          slot.docType.id,
        );

        if (slot.existingId) {
          const { error: dbError } = await backendDb
            .from("documents")
            .update({
              file_url: fileUrl,
              status: "pending",
              rejection_reason: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", slot.existingId);
          if (dbError) throw dbError;
        } else {
          const { data: inserted, error: dbError } = await backendDb
            .from("documents")
            .insert({
              user_id: user.id,
              document_type_id: slot.docType.id,
              name: slot.docType.name,
              file_url: fileUrl,
              status: "pending",
            })
            .select("id")
            .single();
          if (dbError) throw dbError;
          setDocuments((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], existingId: inserted!.id };
            return next;
          });
        }
      }

      setDocuments((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          uploading: false,
          uploaded: true,
          status: "pending",
          file: null,
        };
        return next;
      });

      toast({
        title: t("documents.documentUploaded"),
        description: t("documents.documentUploadedDesc", {
          name: slot.docType.name,
        }),
      });
    } catch (error) {
      setDocuments((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], uploading: false };
        return next;
      });
      toast({
        variant: "destructive",
        title: t("documents.uploadFailed"),
        description: getErrorMessage(error, t("common.error")),
      });
    }
  };

  const handleLogoUpload = async (upload: AvatarUploadResult) => {
    if (!user) return;
    setLogoUrl(upload.url);

    if (upload.backend === "legacy") {
      await backendDb
        .from("clinics")
        .update({ logo_url: upload.url })
        .eq("user_id", user.id);
    }
  };

  const handleLocationChange = (location: {
    address: string;
    lat: number | null;
    lng: number | null;
  }) => {
    setLocationData({
      ...locationData,
      address: location.address,
      location_lat: location.lat,
      location_lng: location.lng,
    });
  };

  const saveOrganization = async () => {
    if (!user || !orgData.name.trim()) {
      toast({
        variant: "destructive",
        title: t("auth.errors.orgNameRequired"),
        description: t("onboarding.fields.orgName"),
      });
      return;
    }

    if (!isValidYemeniMobile(orgData.phone)) {
      toast({
        variant: "destructive",
        title: t("onboarding.fields.phone"),
        description: t(
          "onboarding.fields.yemenPhoneInvalid",
          "Enter a valid Yemeni mobile number starting with 71, 73, 77, or 78.",
        ),
      });
      return;
    }

    const formattedPhone = formatYemeniPhone(orgData.phone);

    setIsSubmitting(true);
    try {
      if (
        isGatewayBackendConfigured() &&
        locationData.location_lat !== null &&
        locationData.location_lng !== null
      ) {
        await updateCurrentClinicProfile(
          {
            user,
            userRole: "clinic",
          },
          {
            organizationName: orgData.name.trim(),
            description: orgData.description.trim() || null,
            contactPhone: formattedPhone,
            websiteUrl: locationData.website.trim() || null,
            address: locationData.address.trim() || null,
            locationLat: locationData.location_lat,
            locationLng: locationData.location_lng,
          },
        );
      }

      const { error } = await backendDb
        .from("clinics")
        .update({
          name: orgData.name.trim(),
          email: orgData.email.trim(),
          phone: formattedPhone,
          description: orgData.description.trim(),
          tax_id: orgData.tax_id.trim(),
          logo_url: logoUrl,
        })
        .eq("user_id", user.id);

      throwLegacySyncErrorIfRequired(error, "organization");
      setCurrentStep("location");
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getErrorMessage(error, t("common.error")),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveLocation = async () => {
    if (!user) return;

    const hasValidLocation =
      !!locationData.address.trim() &&
      locationData.location_lat !== null &&
      locationData.location_lng !== null;

    if (!hasValidLocation) {
      toast({
        variant: "destructive",
        title: t("location.selectionRequiredTitle"),
        description: t("location.selectionRequiredDesc"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isGatewayBackendConfigured()) {
        await updateCurrentClinicProfile(
          {
            user,
            userRole: "clinic",
          },
          {
            organizationName: orgData.name.trim(),
            description: orgData.description.trim() || null,
            contactPhone: formatYemeniPhone(orgData.phone),
            websiteUrl: locationData.website.trim() || null,
            address: locationData.address.trim(),
            locationLat: locationData.location_lat,
            locationLng: locationData.location_lng,
          },
        );
      }

      const { error } = await backendDb
        .from("clinics")
        .update({
          address: locationData.address.trim(),
          location_lat: locationData.location_lat,
          location_lng: locationData.location_lng,
          settings: { website: locationData.website.trim() },
        })
        .eq("user_id", user.id);

      throwLegacySyncErrorIfRequired(error, "location");
      setCurrentStep("documents");
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getErrorMessage(error, t("common.error")),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    const requiredDocs = documents.filter((d) => d.docType.is_required);
    const uploadedRequired = requiredDocs.filter((d) => d.uploaded);

    if (uploadedRequired.length < requiredDocs.length) {
      toast({
        variant: "destructive",
        title: t("documents.missingDocuments"),
        description: t("documents.missingDocumentsDesc"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isGatewayBackendConfigured()) {
        await updateGatewayOnboardingStatus(
          {
            user,
            userRole: "clinic",
          },
          {
            requiredDocuments: documents
              .filter((doc) => doc.docType.is_required)
              .map((doc) => getGatewayDocumentTypeKey(doc.docType)),
            missingDocuments: documents
              .filter((doc) => doc.docType.is_required && !doc.uploaded)
              .map((doc) => getGatewayDocumentTypeKey(doc.docType)),
            nextAction:
              "Verification documents submitted for review. Awaiting admin approval.",
            submitForReview: true,
          },
        );
      }

      const { error } = await backendDb
        .from("clinics")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);

      throwLegacySyncErrorIfRequired(error, "completion");

      await refreshOnboardingStatus();
      setCurrentStep("complete");
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: getErrorMessage(error, t("common.error")),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const requiredDocsUploaded = documents.filter(
    (d) => d.docType.is_required && d.uploaded,
  ).length;
  const totalRequiredDocs = documents.filter(
    (d) => d.docType.is_required,
  ).length;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo
                iconClassName="h-9 w-9"
                nameClassName="text-lg font-semibold"
              />
            </Link>
            <LanguageSwitcher variant="text" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <OnboardingProgress steps={steps} currentStep={currentStep} />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === "organization" && (
            <motion.div
              key="organization"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.clinic.orgTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("onboarding.clinic.orgDesc")}
              </p>

              <div className="space-y-5">
                {/* Logo Upload */}
                <div className="flex justify-center pb-4">
                  <AvatarUpload
                    userId={user?.id || ""}
                    currentAvatarUrl={logoUrl}
                    onUpload={handleLogoUpload}
                    name={orgData.name}
                    size="lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t("onboarding.fields.orgName")} *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder={t("onboarding.fields.orgNamePlaceholder")}
                      value={orgData.name}
                      onChange={(e) =>
                        setOrgData({ ...orgData, name: e.target.value })
                      }
                      className="ps-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {t("onboarding.fields.contactEmail")}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t(
                          "onboarding.fields.contactEmailPlaceholder",
                        )}
                        value={orgData.email}
                        onChange={(e) =>
                          setOrgData({ ...orgData, email: e.target.value })
                        }
                        className="ps-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {t("onboarding.fields.phone")}
                    </Label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <span className="absolute start-10 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        +967
                      </span>
                      <Input
                        id="phone"
                        inputMode="numeric"
                        placeholder="77XXXXXXX"
                        value={normalizeYemeniPhoneInput(orgData.phone)}
                        onChange={(e) =>
                          setOrgData({
                            ...orgData,
                            phone: normalizeYemeniPhoneInput(e.target.value),
                          })
                        }
                        className="ps-24"
                      />
                    </div>
                    {orgData.phone && !isValidYemeniMobile(orgData.phone) && (
                      <p className="text-xs text-destructive">
                        {t(
                          "onboarding.fields.yemenPhoneInvalid",
                          "Enter a valid Yemeni mobile number starting with 71, 73, 77, or 78.",
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">
                    {t("onboarding.fields.taxId")} ({t("common.optional")})
                  </Label>
                  <Input
                    id="tax_id"
                    placeholder={t("onboarding.fields.taxIdPlaceholder")}
                    value={orgData.tax_id}
                    onChange={(e) =>
                      setOrgData({ ...orgData, tax_id: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("onboarding.fields.description")}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t("onboarding.fields.descriptionPlaceholder")}
                    value={orgData.description}
                    onChange={(e) =>
                      setOrgData({ ...orgData, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <Button
                  className="w-full min-h-[48px] bg-accent hover:bg-accent/90"
                  size="lg"
                  onClick={saveOrganization}
                  disabled={isSubmitting || !orgData.name.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t("common.continue")}
                      <ArrowRight
                        className={`w-5 h-5 ${isRTL ? "me-2 rotate-180" : "ms-2"}`}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "location" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.clinic.locationTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("onboarding.clinic.locationDesc")}
              </p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>{t("onboarding.fields.fullAddress")}</Label>
                  <LocationPicker
                    value={{
                      address: locationData.address,
                      lat: locationData.location_lat,
                      lng: locationData.location_lng,
                    }}
                    onChange={handleLocationChange}
                    placeholder={t("onboarding.fields.fullAddressPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("onboarding.locationPrecisionHelp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">
                    {t("onboarding.fields.website")} ({t("common.optional")})
                  </Label>
                  <div className="relative">
                    <Globe className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder={t("onboarding.fields.websitePlaceholder")}
                      value={locationData.website}
                      onChange={(e) =>
                        setLocationData({
                          ...locationData,
                          website: e.target.value,
                        })
                      }
                      className="ps-10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("organization")}
                    className="flex-1 min-h-[48px]"
                  >
                    <ArrowLeft
                      className={`w-4 h-4 ${isRTL ? "ms-2 rotate-180" : "me-2"}`}
                      aria-hidden="true"
                    />
                    {t("common.back")}
                  </Button>
                  <Button
                    onClick={saveLocation}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[48px] bg-accent hover:bg-accent/90"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t("common.continue")}
                        <ArrowRight
                          className={`w-5 h-5 ${isRTL ? "me-2 rotate-180" : "ms-2"}`}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "documents" && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.clinic.documentsTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("onboarding.clinic.documentsDesc")}
              </p>
              <p className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                {t("onboarding.documentsHelp")}
              </p>

              <div className="space-y-4">
                {documents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t("documents.noDocsConfigured")}
                  </p>
                )}
                {documents.map((slot, index) => (
                  <DocumentUploadCard
                    key={slot.docType.id}
                    type={slot.docType.id}
                    name={
                      isRTL && slot.docType.name_ar
                        ? slot.docType.name_ar
                        : slot.docType.name
                    }
                    description={slot.docType.description || ""}
                    required={slot.docType.is_required}
                    allowedExtensions={
                      slot.docType.allowed_extensions || undefined
                    }
                    maxSizeMb={slot.docType.max_size_mb || 10}
                    file={slot.file}
                    uploading={slot.uploading}
                    uploaded={slot.uploaded}
                    status={slot.status}
                    rejectionReason={slot.rejectionReason}
                    locked={slot.status !== "rejected"}
                    onFileSelect={(file) => handleFileSelect(index, file)}
                    onUpload={() => uploadDocument(index)}
                    onRemove={() => {
                      setDocuments((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], file: null };
                        return next;
                      });
                    }}
                  />
                ))}

                <p className="text-sm text-muted-foreground text-center pt-2">
                  {requiredDocsUploaded}/{totalRequiredDocs}{" "}
                  {t("documents.required").toLowerCase()}
                </p>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("location")}
                    className="flex-1 min-h-[48px]"
                  >
                    <ArrowLeft
                      className={`w-4 h-4 ${isRTL ? "ms-2 rotate-180" : "me-2"}`}
                      aria-hidden="true"
                    />
                    {t("common.back")}
                  </Button>
                  <Button
                    onClick={completeOnboarding}
                    disabled={
                      isSubmitting || requiredDocsUploaded < totalRequiredDocs
                    }
                    className="flex-1 min-h-[48px] bg-accent hover:bg-accent/90"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      t("onboarding.complete")
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl border border-border p-8 shadow-card text-center"
            >
              <div className="w-20 h-20 rounded-full gradient-accent flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-accent-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.clinic.completeTitle")}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                {t("onboarding.clinic.completeDesc")}
              </p>
              <Button
                size="lg"
                className="min-h-[48px] bg-accent hover:bg-accent/90"
                onClick={() => navigate("/dashboard/clinic")}
              >
                {t("onboarding.clinic.goToDashboard")}
                <ArrowRight
                  className={`w-5 h-5 ${isRTL ? "me-2 rotate-180" : "ms-2"}`}
                  aria-hidden="true"
                />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ClinicOnboarding;

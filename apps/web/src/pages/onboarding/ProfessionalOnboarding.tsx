import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  User,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Phone,
  DollarSign,
  Briefcase,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import DocumentUploadCard from "@/components/onboarding/DocumentUploadCard";
import AvatarUpload from "@/components/onboarding/AvatarUpload";
import LocationPicker from "@/components/location/LocationPicker";
import TaxonomyPicker from "@/components/onboarding/TaxonomyPicker";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import BrandLogo from "@/components/brand/BrandLogo";
import { uploadDocumentToStorage } from "@/lib/storage";
import type { AvatarUploadResult } from "@/lib/storage";
import {
  getGatewayOnboardingStatus,
  isGatewayBackendConfigured,
  updateCurrentProfessionalProfile,
  updateGatewayOnboardingStatus,
} from "@/lib/platform-backend";
import {
  gatewayDocumentTypeMatches,
  getGatewayDocumentTypeKey,
} from "@/lib/document-types";

type Step = "profile" | "qualifications" | "documents" | "complete";

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

const getUserDisplayName = (user: OnboardingAuthUser | null) =>
  getUserMetadataString(user, ["full_name", "display_name", "name"]) ||
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
      `Ignoring legacy professional onboarding ${scope} sync failure`,
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

const ProfessionalOnboarding = () => {
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

  const [currentStep, setCurrentStep] = useState<Step>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location_address: "",
    location_lat: null as number | null,
    location_lng: null as number | null,
    hourly_rate: "",
  });

  const [qualifications, setQualifications] = useState({
    specialties: [] as string[],
    qualifications: [] as string[],
    newSpecialty: "",
    newQualification: "",
  });

  const [documents, setDocuments] = useState<DocumentSlot[]>([]);

  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: t("onboarding.steps.profile"), icon: User },
    {
      key: "qualifications",
      label: t("onboarding.steps.qualifications"),
      icon: Briefcase,
    },
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
    if (!authLoading && (!user || userRole !== "professional")) {
      navigate("/auth");
      return;
    }

    const fetchProfile = async () => {
      if (!user) return;
      const fallbackDisplayName = getUserDisplayName(user);
      const fallbackAvatarUrl = getUserAvatarUrl(user);

      if (fallbackDisplayName) {
        setProfileData((current) =>
          current.full_name.trim()
            ? current
            : { ...current, full_name: fallbackDisplayName },
        );
      }

      if (fallbackAvatarUrl) {
        setAvatarUrl((current) => current ?? fallbackAvatarUrl);
      }

      const { data } = await backendDb
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfileId(data.id);
        setAvatarUrl(data.avatar_url || fallbackAvatarUrl || null);
        setProfileData({
          full_name: data.full_name || fallbackDisplayName,
          phone: data.phone || "",
          bio: data.bio || "",
          location_address: data.location_address || "",
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          hourly_rate: data.hourly_rate?.toString() || "",
        });
        setQualifications((current) => ({
          ...current,
          specialties: data.specialties || [],
          qualifications: data.qualifications || [],
        }));

        if (data.onboarding_completed) {
          navigate("/dashboard/professional");
        }
      }

      let gatewayOnboarding: Awaited<
        ReturnType<typeof getGatewayOnboardingStatus>
      > | null = null;

      if (isGatewayBackendConfigured()) {
        try {
          gatewayOnboarding = await getGatewayOnboardingStatus({
            user,
            userRole: "professional",
          });
        } catch (error) {
          console.warn(
            "Falling back to legacy onboarding documents for professionals",
            error,
          );
        }
      }

      // Fetch active document types for professionals
      const { data: docTypes } = await backendDb
        .from("document_types")
        .select(
          "id, name, name_ar, description, is_required, allowed_extensions, max_size_mb",
        )
        .eq("is_active", true)
        .in("applies_to", ["professional", "both"])
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

      // Fetch user's existing documents
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

    fetchProfile();
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

  const handleAvatarUpload = async (upload: AvatarUploadResult) => {
    if (!user) return;
    setAvatarUrl(upload.url);

    if (upload.backend === "legacy") {
      await backendDb
        .from("profiles")
        .update({ avatar_url: upload.url })
        .eq("user_id", user.id);
    }
  };

  const handleLocationChange = (location: {
    address: string;
    lat: number | null;
    lng: number | null;
  }) => {
    setProfileData({
      ...profileData,
      location_address: location.address,
      location_lat: location.lat,
      location_lng: location.lng,
    });
  };

  const saveProfile = async () => {
    if (!user || !profileData.full_name.trim()) {
      toast({
        variant: "destructive",
        title: t("auth.errors.nameRequired"),
        description: t("onboarding.fields.fullName"),
      });
      return;
    }

    const hasValidLocation =
      !!profileData.location_address.trim() &&
      profileData.location_lat !== null &&
      profileData.location_lng !== null;

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
        await updateCurrentProfessionalProfile(
          {
            user,
            userRole: "professional",
          },
          {
            fullName: profileData.full_name.trim(),
            bio: profileData.bio.trim() || null,
            primaryPhone: profileData.phone.trim() || null,
            specialties: qualifications.specialties,
            qualifications: qualifications.qualifications,
            locationAddress: profileData.location_address.trim(),
            locationLat: profileData.location_lat,
            locationLng: profileData.location_lng,
          },
        );
      }

      const { error } = await backendDb
        .from("profiles")
        .update({
          full_name: profileData.full_name.trim(),
          phone: profileData.phone.trim(),
          bio: profileData.bio.trim(),
          location_address: profileData.location_address.trim(),
          location_lat: profileData.location_lat,
          location_lng: profileData.location_lng,
          hourly_rate: profileData.hourly_rate
            ? parseFloat(profileData.hourly_rate)
            : null,
          avatar_url: avatarUrl,
        })
        .eq("user_id", user.id);

      throwLegacySyncErrorIfRequired(error, "profile");
      setCurrentStep("qualifications");
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

  const saveQualifications = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (isGatewayBackendConfigured()) {
        await updateCurrentProfessionalProfile(
          {
            user,
            userRole: "professional",
          },
          {
            fullName: profileData.full_name.trim(),
            bio: profileData.bio.trim() || null,
            primaryPhone: profileData.phone.trim() || null,
            specialties: qualifications.specialties,
            qualifications: qualifications.qualifications,
            locationAddress: profileData.location_address.trim(),
            locationLat: profileData.location_lat,
            locationLng: profileData.location_lng,
          },
        );
      }

      const { error } = await backendDb
        .from("profiles")
        .update({
          specialties: qualifications.specialties,
          qualifications: qualifications.qualifications,
        })
        .eq("user_id", user.id);

      throwLegacySyncErrorIfRequired(error, "qualifications");
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
            userRole: "professional",
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
        .from("profiles")
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

  const addSpecialty = () => {
    if (qualifications.newSpecialty.trim()) {
      setQualifications({
        ...qualifications,
        specialties: [
          ...qualifications.specialties,
          qualifications.newSpecialty.trim(),
        ],
        newSpecialty: "",
      });
    }
  };

  const addQualification = () => {
    if (qualifications.newQualification.trim()) {
      setQualifications({
        ...qualifications,
        qualifications: [
          ...qualifications.qualifications,
          qualifications.newQualification.trim(),
        ],
        newQualification: "",
      });
    }
  };

  const removeItem = (
    type: "specialties" | "qualifications",
    index: number,
  ) => {
    setQualifications({
      ...qualifications,
      [type]: qualifications[type].filter((_, i) => i !== index),
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          {currentStep === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.professional.profileTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("onboarding.professional.profileDesc")}
              </p>

              <div className="space-y-5">
                {/* Profile Picture Upload */}
                <div className="flex justify-center pb-4">
                  <AvatarUpload
                    userId={user?.id || ""}
                    currentAvatarUrl={avatarUrl}
                    onUpload={handleAvatarUpload}
                    name={profileData.full_name}
                    size="lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    {t("onboarding.fields.fullName")} *
                  </Label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="full_name"
                      placeholder={t("onboarding.fields.fullNamePlaceholder")}
                      value={profileData.full_name}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          full_name: e.target.value,
                        })
                      }
                      className="ps-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("onboarding.fields.phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder={t("onboarding.fields.phonePlaceholder")}
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      className="ps-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("onboarding.fields.location")}</Label>
                  <LocationPicker
                    value={{
                      address: profileData.location_address,
                      lat: profileData.location_lat,
                      lng: profileData.location_lng,
                    }}
                    onChange={handleLocationChange}
                    placeholder={t("onboarding.fields.locationPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("onboarding.locationPrecisionHelp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">
                    {t("onboarding.fields.hourlyRate")}
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="hourly_rate"
                      type="number"
                      placeholder={t("onboarding.fields.hourlyRatePlaceholder")}
                      value={profileData.hourly_rate}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          hourly_rate: e.target.value,
                        })
                      }
                      className="ps-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">{t("onboarding.fields.bio")}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t("onboarding.fields.bioPlaceholder")}
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <Button
                  className="w-full min-h-[48px]"
                  size="lg"
                  onClick={saveProfile}
                  disabled={isSubmitting || !profileData.full_name.trim()}
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

          {currentStep === "qualifications" && (
            <motion.div
              key="qualifications"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-card"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.professional.qualificationsTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("onboarding.professional.qualificationsDesc")}
              </p>

              <div className="space-y-6">
                {/* Specialties */}
                <div className="space-y-3">
                  <Label>{t("onboarding.fields.specialties")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("onboarding.fields.specialtiesHelp")}
                  </p>
                  <TaxonomyPicker
                    table="specialties"
                    value={qualifications.specialties}
                    onChange={(next) =>
                      setQualifications({
                        ...qualifications,
                        specialties: next,
                      })
                    }
                    searchPlaceholder={t("onboarding.fields.searchSpecialties")}
                    emptyMessage={t("onboarding.fields.noSpecialtiesFound")}
                    variant="primary"
                  />
                </div>

                {/* Certifications / Qualifications */}
                <div className="space-y-3">
                  <Label>{t("onboarding.fields.qualifications")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("onboarding.fields.qualificationsHelp")}
                  </p>
                  <TaxonomyPicker
                    table="certifications"
                    value={qualifications.qualifications}
                    onChange={(next) =>
                      setQualifications({
                        ...qualifications,
                        qualifications: next,
                      })
                    }
                    searchPlaceholder={t(
                      "onboarding.fields.searchCertifications",
                    )}
                    emptyMessage={t("onboarding.fields.noCertificationsFound")}
                    variant="secondary"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("profile")}
                    className="flex-1 min-h-[48px]"
                  >
                    <ArrowLeft
                      className={`w-4 h-4 ${isRTL ? "ms-2 rotate-180" : "me-2"}`}
                      aria-hidden="true"
                    />
                    {t("common.back")}
                  </Button>
                  <Button
                    onClick={saveQualifications}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[48px]"
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
                {t("onboarding.professional.documentsTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("onboarding.professional.documentsDesc")}
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
                    onClick={() => setCurrentStep("qualifications")}
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
                    className="flex-1 min-h-[48px]"
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
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("onboarding.professional.completeTitle")}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                {t("onboarding.professional.completeDesc")}
              </p>
              <Button
                size="lg"
                className="min-h-[48px]"
                onClick={() => navigate("/dashboard/professional")}
              >
                {t("onboarding.professional.goToDashboard")}
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

export default ProfessionalOnboarding;

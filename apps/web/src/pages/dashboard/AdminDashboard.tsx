import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Shield,
  UserCog,
  Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { backendDb } from "@/integrations/backend/client";
import { getGatewayAuthorizationHeaders } from "@/lib/auth-backend";
import { BACKEND_CONFIG } from "@/config/backend";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/backend/types";

import StatsGrid from "@/components/dashboard/StatsGrid";
import DocumentViewer from "@/components/admin/DocumentViewer";
import UserDetailSheet from "@/components/admin/UserDetailSheet";
import AdminManagement from "@/components/admin/AdminManagement";
import SystemConfiguration from "@/components/admin/SystemConfiguration";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ListItemSkeleton } from "@/components/ui/skeleton-cards";
import { InlineEmptyState } from "@/components/ui/empty-state";

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
}

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  name: string;
  file_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

interface AdminSnapshot {
  professionals?: Profile[];
  clinics?: Clinic[];
  documents?: Document[];
}

type GatewayVerificationStatus = "pending_review" | "approved" | "rejected";

interface GatewayVerificationReviewInput {
  status: GatewayVerificationStatus;
  outstandingDocuments: string[];
  nextAction: string;
  rejectionReason?: string;
}

interface GatewayVerificationReviewResponse {
  status: GatewayVerificationStatus;
  outstandingDocuments: string[];
  uploadedDocuments: Array<{
    documentType: string;
    bucket: string;
    key: string;
    uploadedAt: string;
  }>;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const calculateAdminStats = (
  professionals: Profile[],
  clinics: Clinic[],
  documents: Document[],
) => ({
  totalProfessionals: professionals.length,
  totalClinics: clinics.length,
  pendingVerifications:
    professionals.filter((p) => p.verification_status === "pending").length +
    clinics.filter((c) => c.verification_status === "pending").length,
  pendingDocuments: documents.filter((d) => d.status === "pending").length,
});

const fetchGatewayAdminSnapshot = async (): Promise<AdminSnapshot | null> => {
  const apiGatewayBaseUrl = BACKEND_CONFIG.apiGatewayBaseUrl;
  const headers = getGatewayAuthorizationHeaders();

  if (!apiGatewayBaseUrl || !headers) {
    return null;
  }

  const response = await fetch(`${apiGatewayBaseUrl}/admin/verification`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AdminSnapshot;
};

const toGatewayReviewStatus = (status: "verified" | "rejected") =>
  status === "verified" ? "approved" : "rejected";

const toLegacyVerificationStatus = (
  status: GatewayVerificationStatus,
): "pending" | "verified" | "rejected" => {
  switch (status) {
    case "approved":
      return "verified";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
};

const uniqueDocumentTypes = (documents: Document[]) =>
  Array.from(
    new Set(
      documents
        .map((document) => document.name?.trim() || document.document_type)
        .filter((documentType): documentType is string =>
          Boolean(documentType),
        ),
    ),
  );

const getGatewayErrorMessage = (
  payload: GatewayVerificationReviewResponse | { message?: string } | null,
) =>
  payload && "message" in payload && typeof payload.message === "string"
    ? payload.message
    : "Verification review failed.";

const reviewGatewayVerification = async (
  subject: string,
  input: GatewayVerificationReviewInput,
) => {
  const apiGatewayBaseUrl = BACKEND_CONFIG.apiGatewayBaseUrl;

  if (!apiGatewayBaseUrl) {
    return null;
  }

  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    return null;
  }

  const response = await fetch(
    `${apiGatewayBaseUrl}/admin/verification/${encodeURIComponent(subject)}`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        ...headers,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | GatewayVerificationReviewResponse
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(getGatewayErrorMessage(payload));
  }

  return payload as GatewayVerificationReviewResponse;
};

const reviewGatewayActorVerification = async (
  subject: string,
  status: "verified" | "rejected",
) => {
  return reviewGatewayVerification(subject, {
    nextAction:
      status === "verified"
        ? "Verification approved by admin."
        : "Verification rejected by admin.",
    outstandingDocuments: [],
    status: toGatewayReviewStatus(status),
  });
};

const buildDocumentGatewayReviewInput = (
  document: Document,
  status: "verified" | "rejected",
  documents: Document[],
  reason?: string,
): GatewayVerificationReviewInput => {
  const unresolvedDocuments = documents.filter(
    (candidate) =>
      candidate.user_id === document.user_id &&
      (candidate.id === document.id || candidate.status !== "verified"),
  );
  const remainingUnresolvedDocuments = unresolvedDocuments.filter(
    (candidate) => candidate.id !== document.id,
  );
  const outstandingDocuments =
    status === "rejected"
      ? uniqueDocumentTypes([document])
      : uniqueDocumentTypes(remainingUnresolvedDocuments);
  const gatewayStatus =
    status === "rejected"
      ? "rejected"
      : outstandingDocuments.length === 0
        ? "approved"
        : "pending_review";

  return {
    nextAction:
      gatewayStatus === "approved"
        ? "Verification approved by admin."
        : gatewayStatus === "rejected"
          ? "Document rejected by admin. Please upload an updated document."
          : "Additional verification documents are still awaiting admin review.",
    outstandingDocuments,
    rejectionReason: status === "rejected" ? reason : undefined,
    status: gatewayStatus,
  };
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const isSuperAdmin = userRole === "super_admin" || userRole === "admin";

  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [professionals, setProfessionals] = useState<Profile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [selectedUser, setSelectedUser] = useState<{
    type: "professional" | "clinic";
    data: Profile | Clinic;
  } | null>(null);

  const [stats, setStats] = useState({
    totalProfessionals: 0,
    totalClinics: 0,
    pendingVerifications: 0,
    pendingDocuments: 0,
  });

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const snapshot = await fetchGatewayAdminSnapshot().catch(() => null);

      if (snapshot) {
        const snapshotProfessionals = snapshot.professionals ?? [];
        const snapshotClinics = snapshot.clinics ?? [];
        const snapshotDocuments = snapshot.documents ?? [];

        setProfessionals(snapshotProfessionals);
        setClinics(snapshotClinics);
        setDocuments(snapshotDocuments);
        setStats(
          calculateAdminStats(
            snapshotProfessionals,
            snapshotClinics,
            snapshotDocuments,
          ),
        );
        return;
      }

      // Fetch professionals
      const { data: profData } = await backendDb
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const nextProfessionals = profData ?? [];
      setProfessionals(nextProfessionals);

      // Fetch clinics
      const { data: clinicData } = await backendDb
        .from("clinics")
        .select("*")
        .order("created_at", { ascending: false });

      const nextClinics = clinicData ?? [];
      setClinics(nextClinics);

      // Fetch documents with user info
      const { data: docData } = await backendDb
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      const enrichedDocs = docData
        ? await Promise.all(
            docData.map(async (doc) => {
              const { data: prof } = await backendDb
                .from("profiles")
                .select("full_name")
                .eq("user_id", doc.user_id)
                .single();

              if (prof) {
                return {
                  ...doc,
                  user_name: prof.full_name,
                  user_role: "professional",
                };
              }

              const { data: clinic } = await backendDb
                .from("clinics")
                .select("name")
                .eq("user_id", doc.user_id)
                .single();

              if (clinic) {
                return { ...doc, user_name: clinic.name, user_role: "clinic" };
              }

              return { ...doc, user_name: "Unknown", user_role: "unknown" };
            }),
          )
        : [];
      setDocuments(enrichedDocs);
      setStats(
        calculateAdminStats(nextProfessionals, nextClinics, enrichedDocs),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (
      !authLoading &&
      (!user || (userRole !== "admin" && userRole !== "super_admin"))
    ) {
      navigate("/auth");
      return;
    }

    if (user && (userRole === "admin" || userRole === "super_admin")) {
      fetchData();
    }
  }, [user, userRole, authLoading, navigate, fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const applyLocalUserVerificationStatus = (
    type: "professional" | "clinic",
    userId: string,
    nextStatus: "pending" | "verified" | "rejected",
    nextDocuments = documents,
  ) => {
    const nextProfessionals =
      type === "professional"
        ? professionals.map((professional) =>
            professional.user_id === userId
              ? { ...professional, verification_status: nextStatus }
              : professional,
          )
        : professionals;
    const nextClinics =
      type === "clinic"
        ? clinics.map((clinic) =>
            clinic.user_id === userId
              ? { ...clinic, verification_status: nextStatus }
              : clinic,
          )
        : clinics;

    setProfessionals(nextProfessionals);
    setClinics(nextClinics);
    setStats(
      calculateAdminStats(nextProfessionals, nextClinics, nextDocuments),
    );
    setSelectedUser((current) =>
      current?.data.user_id === userId
        ? {
            ...current,
            data: {
              ...current.data,
              verification_status: nextStatus,
            },
          }
        : current,
    );
  };

  const applyLocalDocumentVerificationStatus = (
    docId: string,
    status: "verified" | "rejected",
    reason?: string,
  ) => {
    const nextDocuments = documents.map((document) =>
      document.id === docId
        ? {
            ...document,
            rejection_reason: status === "rejected" ? (reason ?? null) : null,
            status,
          }
        : document,
    );

    setDocuments(nextDocuments);
    setStats(calculateAdminStats(professionals, clinics, nextDocuments));
    setSelectedDocument(null);
    return nextDocuments;
  };

  const handleVerifyUser = async (
    type: "professional" | "clinic",
    userId: string,
    status: "verified" | "rejected",
  ) => {
    try {
      const gatewayReview = await reviewGatewayActorVerification(
        userId,
        status,
      );

      if (gatewayReview) {
        applyLocalUserVerificationStatus(
          type,
          userId,
          toLegacyVerificationStatus(gatewayReview.status),
        );
      } else {
        const table = type === "professional" ? "profiles" : "clinics";
        const { error } = await backendDb
          .from(table)
          .update({ verification_status: status })
          .eq("user_id", userId);

        if (error) throw error;
        await fetchData();
      }

      toast({
        title:
          status === "verified"
            ? t("admin.verification.userVerified")
            : t("admin.verification.userRejected"),
        description:
          status === "verified"
            ? t("admin.verification.userVerifiedDesc", {
                type:
                  type === "professional"
                    ? t("admin.roles.professional")
                    : t("admin.roles.clinic"),
              })
            : t("admin.verification.userRejectedDesc", {
                type:
                  type === "professional"
                    ? t("admin.roles.professional")
                    : t("admin.roles.clinic"),
              }),
      });

      setSelectedUser(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    }
  };

  const handleVerifyDocument = async (
    docId: string,
    status: "verified" | "rejected",
    reason?: string,
    documentOverride?: Document,
  ) => {
    try {
      const document =
        documentOverride ??
        documents.find((candidate) => candidate.id === docId) ??
        (selectedDocument?.id === docId ? selectedDocument : null);
      const gatewayReview = document
        ? await reviewGatewayVerification(
            document.user_id,
            buildDocumentGatewayReviewInput(
              document,
              status,
              documents,
              reason,
            ),
          )
        : null;

      if (gatewayReview) {
        const nextDocuments = applyLocalDocumentVerificationStatus(
          docId,
          status,
          reason,
        );
        const actorStatus = toLegacyVerificationStatus(gatewayReview.status);
        const actorType =
          document?.user_role === "professional" ||
          document?.user_role === "clinic"
            ? document.user_role
            : selectedUser?.data.user_id === document?.user_id
              ? selectedUser.type
              : null;

        if (actorType && document) {
          applyLocalUserVerificationStatus(
            actorType,
            document.user_id,
            actorStatus,
            nextDocuments,
          );
        }
      } else {
        const updateData: Database["public"]["Tables"]["documents"]["Update"] =
          {
            status,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
          };

        if (reason) {
          updateData.rejection_reason = reason;
        }

        const { error } = await backendDb
          .from("documents")
          .update(updateData)
          .eq("id", docId);

        if (error) throw error;
        await fetchData();
        setSelectedDocument(null);
      }

      toast({
        title:
          status === "verified"
            ? t("admin.verification.documentVerified")
            : t("admin.verification.documentRejected"),
        description:
          status === "verified"
            ? t("admin.verification.documentVerifiedDesc")
            : t("admin.verification.documentRejectedDesc"),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");

      toast({
        variant: "destructive",
        title: t("common.error"),
        description: message,
      });
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 me-1" />
            {t("common.verified")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 me-1" />
            {t("common.rejected")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 me-1" />
            {t("common.pending")}
          </Badge>
        );
    }
  };

  const filterByStatus = <
    T extends { verification_status?: string; status?: string },
  >(
    items: T[],
    query: string,
    nameField: keyof T,
    emailField?: keyof T,
  ) => {
    let filtered = items;

    // Filter by search
    if (query) {
      filtered = filtered.filter((item) => {
        const name = String(item[nameField] || "").toLowerCase();
        const email = emailField
          ? String(item[emailField] || "").toLowerCase()
          : "";
        return (
          name.includes(query.toLowerCase()) ||
          email.includes(query.toLowerCase())
        );
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => {
        const status = item.verification_status || item.status;
        return status === statusFilter;
      });
    }

    return filtered;
  };

  const filteredProfessionals = filterByStatus(
    professionals,
    searchQuery,
    "full_name",
    "email",
  );
  const filteredClinics = filterByStatus(clinics, searchQuery, "name", "email");
  const filteredDocuments = documents.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingDocuments = documents.filter((d) => d.status === "pending");

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const adminStats = [
    {
      label: t("admin.stats.totalProfessionals"),
      value: stats.totalProfessionals.toString(),
      icon: Users,
    },
    {
      label: t("admin.stats.totalClinics"),
      value: stats.totalClinics.toString(),
      icon: Building2,
    },
    {
      label: t("admin.stats.pendingVerifications"),
      value: stats.pendingVerifications.toString(),
      icon: Clock,
    },
    {
      label: t("admin.stats.pendingDocuments"),
      value: stats.pendingDocuments.toString(),
      icon: FileText,
    },
  ];

  return (
    <div
      className="container mx-auto px-4 py-6 pb-24 md:pb-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Title and Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              {t("admin.title")}
            </h1>
            {isSuperAdmin && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Shield className="w-3 h-3 me-1" />
                {t("admin.superAdmin")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 me-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Stats */}
      <StatsGrid stats={adminStats} variant="primary" />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList
          className={`grid w-full h-auto p-1 ${isSuperAdmin ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"}`}
        >
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
            {t("admin.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger
            value="professionals"
            className="text-xs sm:text-sm py-2"
          >
            <span className="hidden sm:inline">
              {t("admin.tabs.professionals")}
            </span>
            <span className="sm:hidden">{t("admin.tabs.pros")}</span>
            {professionals.filter((p) => p.verification_status === "pending")
              .length > 0 && (
              <span className="ms-1 px-1.5 py-0.5 text-[10px] bg-warning text-warning-foreground rounded-full">
                {
                  professionals.filter(
                    (p) => p.verification_status === "pending",
                  ).length
                }
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="clinics" className="text-xs sm:text-sm py-2">
            {t("admin.tabs.clinics")}
            {clinics.filter((c) => c.verification_status === "pending").length >
              0 && (
              <span className="ms-1 px-1.5 py-0.5 text-[10px] bg-warning text-warning-foreground rounded-full">
                {
                  clinics.filter((c) => c.verification_status === "pending")
                    .length
                }
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm py-2">
            <span className="hidden sm:inline">
              {t("admin.tabs.documents")}
            </span>
            <span className="sm:hidden">{t("admin.tabs.docs")}</span>
            {stats.pendingDocuments > 0 && (
              <span className="ms-1 px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full">
                {stats.pendingDocuments}
              </span>
            )}
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="team" className="text-xs sm:text-sm py-2">
                <UserCog className="w-4 h-4 me-1 hidden sm:block" />
                {t("admin.tabs.admins")}
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs sm:text-sm py-2">
                <Settings2 className="w-4 h-4 me-1 hidden sm:block" />
                <span className="hidden sm:inline">
                  {t("admin.tabs.config")}
                </span>
                <span className="sm:hidden">{t("admin.tabs.settings")}</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Pending Actions */}
          {(stats.pendingDocuments > 0 || stats.pendingVerifications > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-warning/10 border border-warning/20 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">
                  {t("admin.actionRequired")}
                </h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {stats.pendingDocuments > 0 && (
                  <p>
                    •{" "}
                    {t("admin.documentsAwaiting", {
                      count: stats.pendingDocuments,
                    })}
                  </p>
                )}
                {stats.pendingVerifications > 0 && (
                  <p>
                    •{" "}
                    {t("admin.usersAwaiting", {
                      count: stats.pendingVerifications,
                    })}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Recent Signups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {t("admin.recentProfessionals")}
              </h3>
              <div className="space-y-3">
                {isLoading ? (
                  <>
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                  </>
                ) : professionals.length === 0 ? (
                  <InlineEmptyState
                    icon={Users}
                    message={t("admin.noProfessionalsYet")}
                  />
                ) : (
                  professionals.slice(0, 5).map((prof) => (
                    <div
                      key={prof.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors min-h-[52px]"
                      onClick={() =>
                        setSelectedUser({ type: "professional", data: prof })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        setSelectedUser({ type: "professional", data: prof })
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {prof.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {prof.email}
                        </p>
                      </div>
                      {getStatusBadge(prof.verification_status)}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                {t("admin.recentClinics")}
              </h3>
              <div className="space-y-3">
                {isLoading ? (
                  <>
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                  </>
                ) : clinics.length === 0 ? (
                  <InlineEmptyState
                    icon={Building2}
                    message={t("admin.noClinicsYet")}
                  />
                ) : (
                  clinics.slice(0, 5).map((clinic) => (
                    <div
                      key={clinic.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors min-h-[52px]"
                      onClick={() =>
                        setSelectedUser({ type: "clinic", data: clinic })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        setSelectedUser({ type: "clinic", data: clinic })
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {clinic.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {clinic.email}
                        </p>
                      </div>
                      {getStatusBadge(clinic.verification_status)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pending Documents */}
          {pendingDocuments.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4 shadow-card">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-warning" />
                {t("admin.documentsAwaitingReview")}
              </h3>
              <div className="space-y-3">
                {pendingDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {doc.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {doc.user_name} •{" "}
                          {(doc.document_type ?? "").replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 me-1" />
                      {t("common.review")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Professionals Tab */}
        <TabsContent value="professionals" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
              />
              <Input
                placeholder={t("admin.searchProfessionals")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">{t("admin.allStatus")}</option>
              <option value="pending">{t("common.pending")}</option>
              <option value="verified">{t("common.verified")}</option>
              <option value="rejected">{t("common.rejected")}</option>
            </select>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.name")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.email")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.status")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.onboarding")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfessionals.map((prof) => (
                    <tr
                      key={prof.id}
                      className="border-t border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-medium text-foreground">
                          {prof.full_name}
                        </p>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {prof.email}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(prof.verification_status)}
                      </td>
                      <td className="p-4">
                        {prof.onboarding_completed ? (
                          <Badge className="bg-success/10 text-success border-success/20">
                            {t("common.complete")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t("common.incomplete")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedUser({
                                type: "professional",
                                data: prof,
                              })
                            }
                          >
                            <Eye className="w-4 h-4 me-1" />
                            {t("common.view")}
                          </Button>
                          {user && (
                            <StartChatButton
                              targetType="professional"
                              targetId={prof.id}
                              targetUserId={prof.user_id}
                              currentProfileId={user.id}
                              currentUserType="admin"
                              size="sm"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProfessionals.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        {t("admin.noProfessionalsYet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Clinics Tab */}
        <TabsContent value="clinics" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
              />
              <Input
                placeholder={t("admin.searchClinics")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">{t("admin.allStatus")}</option>
              <option value="pending">{t("common.pending")}</option>
              <option value="verified">{t("common.verified")}</option>
              <option value="rejected">{t("common.rejected")}</option>
            </select>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.name")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.email")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.status")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.onboarding")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClinics.map((clinic) => (
                    <tr
                      key={clinic.id}
                      className="border-t border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-medium text-foreground">
                          {clinic.name}
                        </p>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {clinic.email}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(clinic.verification_status)}
                      </td>
                      <td className="p-4">
                        {clinic.onboarding_completed ? (
                          <Badge className="bg-success/10 text-success border-success/20">
                            {t("common.complete")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t("common.incomplete")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedUser({ type: "clinic", data: clinic })
                            }
                          >
                            <Eye className="w-4 h-4 me-1" />
                            {t("common.view")}
                          </Button>
                          {user && (
                            <StartChatButton
                              targetType="clinic"
                              targetId={clinic.id}
                              targetUserId={clinic.user_id}
                              currentProfileId={user.id}
                              currentUserType="admin"
                              size="sm"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClinics.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        {t("admin.noClinicsYet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
              />
              <Input
                placeholder={t("admin.searchDocuments")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">{t("admin.allStatus")}</option>
              <option value="pending">{t("common.pending")}</option>
              <option value="verified">{t("common.verified")}</option>
              <option value="rejected">{t("common.rejected")}</option>
            </select>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.document")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.user")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.type")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.status")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.uploaded")}
                    </th>
                    <th
                      className={`${isRTL ? "text-right" : "text-left"} p-4 font-medium text-muted-foreground`}
                    >
                      {t("admin.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="font-medium text-foreground">
                            {doc.name}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-foreground">{doc.user_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {doc.user_role}
                        </p>
                      </td>
                      <td className="p-4 text-muted-foreground capitalize">
                        {(doc.document_type ?? "").replace(/_/g, " ")}
                      </td>
                      <td className="p-4">{getStatusBadge(doc.status)}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString(
                          isRTL ? "ar-SA" : "en-US",
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant={
                            doc.status === "pending" ? "default" : "outline"
                          }
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <Eye className="w-4 h-4 me-1" />
                          {doc.status === "pending"
                            ? t("common.review")
                            : t("common.view")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredDocuments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        {t("admin.noDocumentsFound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Team Management Tab (Super Admin Only) */}
        {isSuperAdmin && (
          <>
            <TabsContent value="team">
              <AdminManagement />
            </TabsContent>
            <TabsContent value="config">
              <SystemConfiguration />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modals */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onVerify={(status, reason) =>
            handleVerifyDocument(
              selectedDocument.id,
              status,
              reason,
              selectedDocument,
            )
          }
        />
      )}

      {selectedUser && (
        <UserDetailSheet
          type={selectedUser.type}
          user={selectedUser.data}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onVerify={(status) =>
            handleVerifyUser(
              selectedUser.type,
              selectedUser.data.user_id,
              status,
            )
          }
          onDocumentVerify={(document, status, reason) =>
            handleVerifyDocument(document.id, status, reason, document)
          }
        />
      )}
    </div>
  );
};

export default AdminDashboard;

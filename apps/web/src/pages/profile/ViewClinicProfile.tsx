import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  MapPin,
  Mail,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  XCircle,
  Lock,
  MessageCircle,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ProfileCardSkeleton,
  ProfileSidebarSkeleton,
  ShiftItemSkeleton,
} from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { useVerifiedProfileAccess } from "@/hooks/useVerifiedProfileAccess";
import {
  getLegacyClinicById,
  isPlatformBackendConfigured,
  listLegacyJobs,
} from "@/lib/platform-backend";

interface Clinic {
  id: string;
  name: string;
  email?: string;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_status: string;
}

interface Shift {
  id: string;
  title: string;
  role_required: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  is_urgent: boolean;
  is_filled: boolean;
}

const ViewClinicProfile = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { accessState } = useVerifiedProfileAccess();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || accessState !== "allowed") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        if (isPlatformBackendConfigured()) {
          try {
            const clinicData = await getLegacyClinicById(id);
            setClinic(clinicData);
          } catch (platformClinicError) {
            console.error(
              "Error fetching clinic from platform API:",
              platformClinicError,
            );

            const { data: clinicData, error: clinicError } = await backendDb
              .from("clinics")
              .select("*")
              .eq("id", id)
              .single();

            if (clinicError) throw clinicError;
            setClinic(clinicData);
          }

          try {
            const jobs = await listLegacyJobs();
            setShifts(
              jobs
                .filter((job) => job.clinic.id === id && !job.is_filled)
                .slice(0, 5),
            );
          } catch (jobsError) {
            console.error("Error fetching clinic jobs:", jobsError);
            setShifts([]);
          }
        } else {
          const { data: clinicData, error: clinicError } = await backendDb
            .from("clinics")
            .select("*")
            .eq("id", id)
            .single();

          if (clinicError) throw clinicError;
          setClinic(clinicData);

          const { data: shiftsData, error: shiftsError } = await backendDb
            .from("shifts")
            .select("*")
            .eq("clinic_id", id)
            .eq("is_filled", false)
            .gte("shift_date", new Date().toISOString().split("T")[0])
            .order("shift_date", { ascending: true })
            .limit(5);

          if (!shiftsError && shiftsData) {
            setShifts(shiftsData);
          }
        }

        // If user is a professional, fetch their profile ID for chat functionality
        if (user && userRole === "professional") {
          const { data: profileData } = await backendDb
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (profileData) {
            setProfessionalId(profileData.id);
          }
        }
      } catch (error) {
        console.error("Error fetching clinic:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [accessState, id, user, userRole]);

  if (accessState === "checking" || isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" disabled>
              <ArrowLeft className="w-4 h-4 me-2" aria-hidden="true" />
              {t("common.back")}
            </Button>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProfileCardSkeleton />
              {/* Shifts skeleton */}
              <Card>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase
                      className="w-4 h-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-muted-foreground">
                      {t("viewProfile.openShifts")}
                    </span>
                  </div>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <ShiftItemSkeleton key={i} />
                  ))}
                </CardContent>
              </Card>
            </div>
            <div>
              <ProfileSidebarSkeleton />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center px-4 py-12"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <main className="w-full max-w-2xl">
          <EmptyState
            icon={Lock}
            title={t("viewProfile.loginRequiredTitle")}
            description={t("viewProfile.loginRequiredDescription")}
            action={
              <Button asChild>
                <Link to="/auth">{t("common.logIn")}</Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  if (accessState === "unverified") {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center px-4 py-12"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <main className="w-full max-w-2xl">
          <EmptyState
            icon={Lock}
            title={t("viewProfile.verifiedRequiredTitle")}
            description={t("viewProfile.verifiedRequiredDescription")}
            action={
              <Button asChild>
                <Link to="/">{t("notFound.goHome")}</Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
        <Header />
        <main className="container mx-auto px-4 py-12">
          <EmptyState
            icon={XCircle}
            title={t("viewProfile.clinicNotFound")}
            description={t(
              "viewProfile.clinicNotFoundDescription",
              "This clinic profile could not be found or may have been removed.",
            )}
            action={
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 me-2" aria-hidden="true" />
                  {t("common.back")}
                </Link>
              </Button>
            }
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 me-2" />
            {t("common.back")}
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-card">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                    <AvatarImage
                      src={clinic.logo_url || undefined}
                      alt={clinic.name}
                    />
                    <AvatarFallback className="text-2xl bg-accent/10 text-accent">
                      <Building2 className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h1 className="text-2xl font-bold text-foreground">
                        {clinic.name}
                      </h1>
                      {clinic.verification_status === "verified" && (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="w-3 h-3 me-1" />
                          {t("common.verified")}
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    {clinic.rating_avg && clinic.rating_avg > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-warning fill-warning" />
                          <span className="font-semibold text-foreground">
                            {clinic.rating_avg.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          ({clinic.rating_count} {t("viewProfile.reviews")})
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    {clinic.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {clinic.address}
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Description */}
                {clinic.description && (
                  <div className="mb-6">
                    <h2 className="font-semibold text-foreground mb-3">
                      {t("viewProfile.aboutClinic")}
                    </h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {clinic.description}
                    </p>
                  </div>
                )}

                {/* Open Shifts Section */}
                {shifts.length > 0 && userRole === "professional" && (
                  <div>
                    <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {t("viewProfile.openShifts")} ({shifts.length})
                    </h2>
                    <div className="space-y-3">
                      {shifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="bg-secondary/30 rounded-lg p-4 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/dashboard/professional`)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">
                                  {shift.role_required}
                                </span>
                                {shift.is_urgent && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {t("common.urgent")}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(
                                    shift.shift_date,
                                  ).toLocaleDateString(
                                    isRTL ? "ar-SA" : "en-US",
                                  )}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {shift.start_time} - {shift.end_time}
                                </span>
                              </div>
                            </div>
                            <div className="text-end">
                              <span className="font-semibold text-primary">
                                ${shift.hourly_rate}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {t("common.perHour")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-card sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("viewProfile.contactInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chat Button - Primary action for professionals */}
                {userRole === "professional" && professionalId && clinic && (
                  <StartChatButton
                    targetType="clinic"
                    targetId={clinic.id}
                    currentProfileId={professionalId}
                    currentUserType="professional"
                    variant="default"
                    className="w-full"
                  />
                )}

                {/* Phone number hidden for privacy */}
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.phone")}
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {t("viewProfile.contactHidden")}
                    </p>
                  </div>
                </div>

                {/* Email hidden for privacy */}
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("auth.email")}
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {t("viewProfile.contactHidden")}
                    </p>
                  </div>
                </div>

                {clinic.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.address")}
                      </p>
                      <p className="font-medium text-foreground">
                        {clinic.address}
                      </p>
                    </div>
                  </div>
                )}

                {/* Login prompt for non-logged users */}
                {!user && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("viewProfile.loginToContact")}
                    </p>
                    <Button asChild className="w-full">
                      <Link to="/auth">{t("common.logIn")}</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ViewClinicProfile;

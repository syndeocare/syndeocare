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
  CheckCircle2,
  Clock,
  Award,
  Briefcase,
  UserX,
  MessageCircle,
  Lock,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ProfileCardSkeleton,
  ProfileSidebarSkeleton,
} from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { useVerifiedProfileAccess } from "@/hooks/useVerifiedProfileAccess";
import {
  getLegacyProfessionalById,
  isPlatformBackendConfigured,
} from "@/lib/platform-backend";
import { formatHourlyRate } from "@/lib/format";

interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  qualifications: string[] | null;
  hourly_rate: number | null;
  location_address: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_status: string;
  is_available: boolean | null;
}

const ViewProfessionalProfile = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const language = isRTL ? "ar" : "en";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { accessState } = useVerifiedProfileAccess();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || accessState !== "allowed") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        if (isPlatformBackendConfigured()) {
          const data = await getLegacyProfessionalById(id);
          setProfile(data);
        } else {
          const { data, error } = await backendDb
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;
          setProfile(data);
        }

        // If user is a clinic, fetch their clinic ID for chat functionality
        if (user && userRole === "clinic") {
          const { data: clinicData } = await backendDb
            .from("clinics")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (clinicData) {
            setClinicId(clinicData.id);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
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
            <div className="lg:col-span-2">
              <ProfileCardSkeleton />
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
        <Header />
        <main className="container mx-auto px-4 py-12">
          <EmptyState
            icon={UserX}
            title={t("viewProfile.notFound")}
            description={t(
              "viewProfile.notFoundDescription",
              "This professional profile could not be found or may have been removed.",
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
                      src={profile.avatar_url || undefined}
                      alt={profile.full_name}
                    />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {profile.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h1 className="text-2xl font-bold text-foreground">
                        {profile.full_name}
                      </h1>
                      {profile.verification_status === "verified" && (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="w-3 h-3 me-1" />
                          {t("common.verified")}
                        </Badge>
                      )}
                      {profile.is_available && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          {t("viewProfile.availableForShifts")}
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    {profile.rating_avg && profile.rating_avg > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-warning fill-warning" />
                          <span className="font-semibold text-foreground">
                            {profile.rating_avg.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          ({profile.rating_count} {t("viewProfile.reviews")})
                        </span>
                      </div>
                    )}

                    {/* Quick Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {profile.location_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {profile.location_address}
                        </span>
                      )}
                      {profile.hourly_rate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatHourlyRate(profile.hourly_rate, language)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Bio */}
                {profile.bio && (
                  <div className="mb-6">
                    <h2 className="font-semibold text-foreground mb-3">
                      {t("viewProfile.about")}
                    </h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Specialties */}
                {profile.specialties && profile.specialties.length > 0 && (
                  <div className="mb-6">
                    <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {t("profile.specialties")}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.specialties.map((spec, i) => (
                        <Badge key={i} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualifications */}
                {profile.qualifications &&
                  profile.qualifications.length > 0 && (
                    <div>
                      <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        {t("profile.qualifications")}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.qualifications.map((qual, i) => (
                          <Badge key={i} variant="outline">
                            {qual}
                          </Badge>
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
                {/* Chat Button - Primary action */}
                {userRole === "clinic" && clinicId && profile && (
                  <StartChatButton
                    targetType="professional"
                    targetId={profile.id}
                    currentProfileId={clinicId}
                    currentUserType="clinic"
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

                {profile.location_address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.location")}
                      </p>
                      <p className="font-medium text-foreground">
                        {profile.location_address}
                      </p>
                    </div>
                  </div>
                )}

                {profile.hourly_rate && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.hourlyRate")}
                      </p>
                      <p className="font-medium text-foreground">
                        {formatHourlyRate(profile.hourly_rate, language)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Login prompt for non-clinics */}
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

export default ViewProfessionalProfile;

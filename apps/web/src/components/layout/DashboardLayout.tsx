import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Loader2 } from "lucide-react";

const DashboardLayout = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const {
    user,
    userRole,
    isLoading: authLoading,
    isOnboardingComplete,
  } = useAuth();
  const navigate = useNavigate();
  const { isLoading: isLoadingProfile } = useProfile();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    if (
      userRole &&
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      !isOnboardingComplete
    ) {
      if (userRole === "professional") {
        navigate("/onboarding/professional");
      } else if (userRole === "clinic") {
        navigate("/onboarding/clinic");
      }
    }
  }, [user, userRole, authLoading, isOnboardingComplete, navigate]);

  if (authLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <DashboardHeader />
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;

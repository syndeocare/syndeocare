import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CTASection from "@/components/home/CTASection";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, userRole, isOnboardingComplete, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user && userRole) {
      // Redirect logged-in users to their appropriate dashboard
      if (!isOnboardingComplete) {
        navigate(
          userRole === "clinic"
            ? "/onboarding/clinic"
            : "/onboarding/professional",
        );
      } else if (userRole === "admin" || userRole === "super_admin") {
        navigate("/admin");
      } else if (userRole === "clinic") {
        navigate("/dashboard/clinic");
      } else if (userRole === "professional") {
        navigate("/dashboard/professional");
      }
    }
  }, [user, userRole, isOnboardingComplete, isLoading, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in, they'll be redirected - show loading
  if (user && userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

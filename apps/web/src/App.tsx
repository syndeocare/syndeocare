import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageSkeleton from "@/components/PageSkeleton";
import { lazy, Suspense } from "react";
import { useNativeBootstrap } from "@/hooks/useNative";
import { useNativePush } from "@/hooks/useNativePush";
import { useAuth } from "@/contexts/AuthContext";

// Bridges native side-effects into the app once the auth context is mounted.
const NativeBridge = () => {
  useNativeBootstrap();
  const { user } = useAuth();
  useNativePush(user?.id);
  return null;
};

// Lazy-loaded routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyCallback = lazy(() => import("./pages/VerifyCallback"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const ForProfessionals = lazy(() => import("./pages/ForProfessionals"));
const ForClinics = lazy(() => import("./pages/ForClinics"));
const About = lazy(() => import("./pages/About"));
const ProfessionalOnboarding = lazy(
  () => import("./pages/onboarding/ProfessionalOnboarding"),
);
const ClinicOnboarding = lazy(
  () => import("./pages/onboarding/ClinicOnboarding"),
);
const ProfessionalDashboard = lazy(
  () => import("./pages/dashboard/ProfessionalDashboard"),
);
const ClinicDashboard = lazy(() => import("./pages/dashboard/ClinicDashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const ProfessionalProfile = lazy(
  () => import("./pages/profile/ProfessionalProfile"),
);
const ClinicProfile = lazy(() => import("./pages/profile/ClinicProfile"));
const ViewProfessionalProfile = lazy(
  () => import("./pages/profile/ViewProfessionalProfile"),
);
const ViewClinicProfile = lazy(
  () => import("./pages/profile/ViewClinicProfile"),
);
const ShiftSearch = lazy(() => import("./pages/shifts/ShiftSearch"));
const SearchProfessionals = lazy(() => import("./pages/SearchProfessionals"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));
const Messages = lazy(() => import("./pages/Messages"));
const Settings = lazy(() => import("./pages/profile/Settings"));
const Logout = lazy(() => import("./pages/Logout"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <NativeBridge />
                <main id="main-content">
                  <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/auth/oauth/callback" element={<Auth />} />
                      <Route path="/login" element={<Auth />} />
                      <Route path="/signup" element={<Auth />} />
                      <Route
                        path="/reset-password"
                        element={<ResetPassword />}
                      />
                      <Route
                        path="/verify-email"
                        element={<EmailVerification />}
                      />
                      <Route path="/verify-otp" element={<VerifyOTP />} />
                      <Route
                        path="/verify-callback"
                        element={<VerifyCallback />}
                      />
                      <Route
                        path="/for-professionals"
                        element={<ForProfessionals />}
                      />
                      <Route path="/for-clinics" element={<ForClinics />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/design-system" element={<DesignSystem />} />
                      <Route path="/logout" element={<Logout />} />
                      <Route path="/legal/:slug" element={<LegalPage />} />
                      <Route
                        path="/privacy"
                        element={<LegalPage forcedSlug="privacy" />}
                      />
                      <Route
                        path="/terms"
                        element={<LegalPage forcedSlug="terms" />}
                      />
                      <Route
                        path="/help"
                        element={<LegalPage forcedSlug="help" />}
                      />

                      {/* Onboarding routes (no layout) */}
                      <Route
                        path="/onboarding/professional"
                        element={<ProfessionalOnboarding />}
                      />
                      <Route
                        path="/onboarding/clinic"
                        element={<ClinicOnboarding />}
                      />

                      {/* Public profile views */}
                      <Route
                        path="/professional/:id"
                        element={<ViewProfessionalProfile />}
                      />
                      <Route
                        path="/clinic/:id"
                        element={<ViewClinicProfile />}
                      />

                      {/* Authenticated routes with shared DashboardLayout */}
                      <Route element={<DashboardLayout />}>
                        <Route
                          path="/dashboard/professional"
                          element={<ProfessionalDashboard />}
                        />
                        <Route
                          path="/dashboard/clinic"
                          element={<ClinicDashboard />}
                        />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route
                          path="/profile/professional"
                          element={<ProfessionalProfile />}
                        />
                        <Route
                          path="/profile/clinic"
                          element={<ClinicProfile />}
                        />
                        <Route path="/shifts" element={<ShiftSearch />} />
                        <Route
                          path="/search/professionals"
                          element={<SearchProfessionals />}
                        />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>

                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>
                <MobileBottomNav />
              </AuthProvider>
            </BrowserRouter>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

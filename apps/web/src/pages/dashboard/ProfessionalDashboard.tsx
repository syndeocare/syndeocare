import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Banknote,
  Star,
  Filter,
  Search,
  ChevronRight,
  Building2,
  Loader2,
  MapPin,
  FileText,
  Upload,
  User,
  X,
  UserPlus,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { backendDb } from "@/integrations/backend/client";
import { useTranslation } from "react-i18next";
import StatsGrid from "@/components/dashboard/StatsGrid";
import OnboardingBanner from "@/components/dashboard/OnboardingBanner";
import ShiftDetailModal from "@/components/shifts/ShiftDetailModal";
import { ShiftCardSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import ActiveBookingsSection from "@/components/booking/ActiveBookingsSection";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import ShiftInvitationCard from "@/components/shifts/ShiftInvitationCard";
import {
  getCurrentProfessionalProfile,
  isGatewayBackendConfigured,
  isPlatformBackendConfigured,
  listLegacyBookings,
  listLegacyJobs,
} from "@/lib/platform-backend";
import {
  DEFAULT_JOB_ROLE_OPTIONS,
  fetchActiveJobRoleNames,
  withAllOption,
} from "@/lib/admin-catalogs";
import { formatHourlyRate, formatMoney } from "@/lib/format";

interface Shift {
  id: string;
  source?: "platform" | "legacy";
  title: string;
  role_required: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  currency?: string;
  location_address: string | null;
  description: string | null;
  required_certifications: string[] | null;
  is_urgent: boolean;
  clinic: {
    id: string;
    name: string;
    address: string | null;
    rating_avg: number | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  rating_avg: number;
  verification_status: string;
  onboarding_completed: boolean;
  avatar_url: string | null;
}

interface Document {
  id: string;
  status: string;
}

interface BookingShiftSummary {
  hourly_rate: number;
  start_time: string;
  end_time: string;
}

interface ShiftEarningsBooking {
  shift: BookingShiftSummary | null;
}

interface ShiftInvitationRecord {
  id: string;
  shift_id: string;
  clinic_id: string;
  professional_id: string;
  status: string;
  message: string | null;
  created_at: string;
  shift: {
    id: string;
    title: string;
    role_required: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    location_address: string | null;
  } | null;
  clinic: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

interface Filters {
  role: string;
  minRate: string;
  dateRange: string;
}

const ProfessionalDashboard = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language === "ar" ? "ar" : "en";
  const [searchQuery, setSearchQuery] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftDetail, setShowShiftDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [roleOptions, setRoleOptions] = useState(
    withAllOption(DEFAULT_JOB_ROLE_OPTIONS),
  );
  const [filters, setFilters] = useState<Filters>({
    role: "All Roles",
    minRate: "",
    dateRange: "all",
  });
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [completedShifts, setCompletedShifts] = useState(0);
  const [invitations, setInvitations] = useState<ShiftInvitationRecord[]>([]);
  const {
    user,
    userRole,
    isLoading: authLoading,
    isOnboardingComplete,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user || userRole !== "professional") {
        navigate("/auth");
        return;
      }
      if (!isOnboardingComplete) {
        navigate("/onboarding/professional");
        return;
      }
    }
  }, [user, userRole, authLoading, isOnboardingComplete, navigate]);

  useEffect(() => {
    void fetchActiveJobRoleNames().then((roles) =>
      setRoleOptions(withAllOption(roles)),
    );
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        let profileData: Profile | null = null;

        if (isGatewayBackendConfigured()) {
          try {
            profileData = (await getCurrentProfessionalProfile({
              user,
              userRole: "professional",
            })) as unknown as Profile;
          } catch (error) {
            console.warn(
              "Falling back to BackendDb professional dashboard bridge",
              error,
            );
          }
        }

        if (!profileData) {
          const { data } = await backendDb
            .from("profiles")
            .select(
              "id, full_name, rating_avg, verification_status, onboarding_completed, avatar_url",
            )
            .eq("user_id", user.id)
            .single();
          profileData = data;
        }

        if (profileData) {
          setProfile(profileData);

          if (isGatewayBackendConfigured()) {
            try {
              const bookings = await listLegacyBookings({
                user,
                userRole: "professional",
                profileId: profileData.id,
                verificationStatus:
                  profileData.verification_status === "verified"
                    ? "verified"
                    : profileData.verification_status === "rejected"
                      ? "rejected"
                      : "pending",
                onboardingCompleted: profileData.onboarding_completed,
                displayName: profileData.full_name,
              });

              const completedBookings = bookings.filter((booking) =>
                ["completed"].includes(booking.status),
              );
              setCompletedShifts(completedBookings.length);

              const earnings = completedBookings.reduce((total, booking) => {
                const [startH, startM] = booking.shift.start_time
                  .split(":")
                  .map(Number);
                const [endH, endM] = booking.shift.end_time
                  .split(":")
                  .map(Number);
                const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
                return (
                  total +
                  (hours > 0 ? hours : 24 + hours) * booking.shift.hourly_rate
                );
              }, 0);
              setMonthlyEarnings(earnings);
            } catch (error) {
              console.warn(
                "Falling back to BackendDb professional booking stats",
                error,
              );
            }
          }

          if (!monthlyEarnings && !completedShifts) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: bookingsData } = await backendDb
              .from("bookings")
              .select(
                `
                id,
                status,
                shift:shifts(hourly_rate, start_time, end_time)
              `,
              )
              .eq("professional_id", profileData.id)
              .in("status", ["completed", "checked_out"])
              .gte("created_at", startOfMonth.toISOString());

            if (bookingsData) {
              setCompletedShifts(bookingsData.length);

              let earnings = 0;
              bookingsData.forEach((booking: ShiftEarningsBooking) => {
                if (booking.shift) {
                  const [startH, startM] = booking.shift.start_time
                    .split(":")
                    .map(Number);
                  const [endH, endM] = booking.shift.end_time
                    .split(":")
                    .map(Number);
                  const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
                  earnings +=
                    (hours > 0 ? hours : 24 + hours) *
                    booking.shift.hourly_rate;
                }
              });
              setMonthlyEarnings(earnings);
            }
          }
        }

        // Fetch user documents
        const { data: docsData } = await backendDb
          .from("documents")
          .select("id, status")
          .eq("user_id", user.id);

        if (docsData) {
          setDocuments(docsData);
        }

        // Fetch available shifts
        await fetchShifts();

        // Fetch invitations
        if (profileData) {
          await fetchInvitations(profileData.id);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isOnboardingComplete) {
      fetchData();
    }
  }, [user, isOnboardingComplete]);

  const fetchInvitations = async (profId: string) => {
    const { data } = await backendDb
      .from("shift_invitations")
      .select(
        "id, shift_id, clinic_id, professional_id, status, message, created_at",
      )
      .eq("professional_id", profId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (inv): Promise<ShiftInvitationRecord> => {
          const { data: shift } = await backendDb
            .from("shifts")
            .select(
              "id, title, role_required, shift_date, start_time, end_time, hourly_rate, location_address",
            )
            .eq("id", inv.shift_id)
            .single();
          const { data: clinic } = await backendDb
            .from("clinics")
            .select("id, name, logo_url")
            .eq("id", inv.clinic_id)
            .single();
          return { ...inv, shift, clinic };
        }),
      );
      setInvitations(enriched);
    }
  };

  const fetchShifts = async () => {
    const today = new Date().toISOString().split("T")[0];
    let data: Shift[] = [];

    if (isPlatformBackendConfigured()) {
      try {
        const jobs = await listLegacyJobs({
          specialty: filters.role !== "All Roles" ? filters.role : undefined,
        });
        data = jobs as unknown as Shift[];
      } catch (error) {
        console.warn("Falling back to BackendDb professional jobs feed", error);
      }
    }

    let query = backendDb
      .from("shifts")
      .select(
        `
        id,
        title,
        role_required,
        shift_date,
        start_time,
        end_time,
        hourly_rate,
        location_address,
        description,
        required_certifications,
        is_urgent,
        clinic:clinics(id, name, address, rating_avg)
      `,
      )
      .eq("is_filled", false)
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .limit(20);

    if (filters.role && filters.role !== "All Roles") {
      query = query.ilike("role_required", `%${filters.role}%`);
    }

    if (filters.minRate) {
      query = query.gte("hourly_rate", parseFloat(filters.minRate));
    }

    if (filters.dateRange === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.eq("shift_date", today);
    } else if (filters.dateRange === "week") {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      query = query.lte("shift_date", nextWeek.toISOString().split("T")[0]);
    } else if (filters.dateRange === "month") {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      query = query.lte("shift_date", nextMonth.toISOString().split("T")[0]);
    }

    const { data: shiftsData } = await query;

    if (shiftsData) {
      data = [
        ...data,
        ...(shiftsData as unknown as Shift[]).map((shift) => ({
          ...shift,
          source: "legacy" as const,
        })),
      ];
    }

    const uniqueData = Array.from(
      new Map(data.map((shift) => [shift.id, shift])).values(),
    );
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setShifts(
      uniqueData
        .filter((shift) =>
          filters.minRate
            ? shift.hourly_rate >= parseFloat(filters.minRate)
            : true,
        )
        .filter((shift) => shift.shift_date >= today)
        .filter((shift) => {
          if (filters.dateRange === "today") {
            return shift.shift_date === today;
          }
          if (filters.dateRange === "week") {
            return shift.shift_date <= nextWeek.toISOString().split("T")[0];
          }
          if (filters.dateRange === "month") {
            return shift.shift_date <= nextMonth.toISOString().split("T")[0];
          }
          return true;
        }),
    );
  };

  useEffect(() => {
    if (user && isOnboardingComplete) {
      fetchShifts();
    }
  }, [filters]);

  const clearFilters = () => {
    setFilters({ role: "All Roles", minRate: "", dateRange: "all" });
  };

  const hasActiveFilters =
    filters.role !== "All Roles" ||
    filters.minRate ||
    filters.dateRange !== "all";

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingDocs = documents.filter((d) => d.status === "pending").length;
  const totalDocs = documents.length;

  const stats = [
    {
      label: t("dashboard.stats.monthlyEarnings"),
      value: formatMoney(monthlyEarnings, language),
      icon: Banknote,
    },
    {
      label: t("dashboard.stats.shiftsCompleted"),
      value: completedShifts.toString(),
      icon: Calendar,
    },
    {
      label: t("dashboard.stats.avgRating"),
      value: profile?.rating_avg ? `${profile.rating_avg.toFixed(1)}★` : "N/A",
      icon: Star,
    },
    {
      label: t("dashboard.stats.documents"),
      value: `${totalDocs}`,
      icon: FileText,
    },
  ];

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t("dashboard.welcome")}, {profile?.full_name?.split(" ")[0] || ""}!
          </h1>
          <p className="text-muted-foreground">{t("dashboard.noShiftsDesc")}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/profile/professional">
            <User className="w-4 h-4 me-2" />
            {t("nav.profile")}
          </Link>
        </Button>
      </motion.div>

      {/* Onboarding/Verification Banner */}
      <OnboardingBanner
        type="professional"
        onboardingComplete={profile?.onboarding_completed || false}
        verificationStatus={profile?.verification_status || "pending"}
        pendingDocuments={pendingDocs}
        totalDocuments={totalDocs}
      />

      {/* Quick Actions */}
      {totalDocs === 0 && profile?.verification_status !== "verified" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-6 rounded-xl bg-card border border-border shadow-card"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {t("dashboard.needsVerification")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("onboarding.incompleteDesc")}
              </p>
            </div>
            <Button asChild>
              <Link to="/profile/professional?tab=documents">
                <Upload className="w-4 h-4 me-2" />
                {t("profile.uploadDocument")}
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <StatsGrid stats={stats} variant="primary" />

      {/* Shift Invitations */}
      {invitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t("shifts.invitations.title")}
            <Badge variant="default" className="text-xs">
              {invitations.length}
            </Badge>
          </h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <ShiftInvitationCard
                key={inv.id}
                invitation={inv}
                onRespond={() => profile && fetchInvitations(profile.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Active Bookings */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("booking.activeShifts")}
          </h2>
          <ActiveBookingsSection
            profileId={profile.id}
            userType="professional"
          />
        </motion.div>
      )}

      {/* Available Shifts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("dashboard.availableShifts")}
          </h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 me-1" />
              {t("dashboard.filters.clearFilters")}
            </Button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("dashboard.search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="icon"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">
                  {t("common.filter")}
                </h4>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("dashboard.filters.role")}
                  </label>
                  <Select
                    value={filters.role}
                    onValueChange={(value) =>
                      setFilters({ ...filters, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("dashboard.filters.minRate")}
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    value={filters.minRate}
                    onChange={(e) =>
                      setFilters({ ...filters, minRate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("dashboard.filters.dateRange")}
                  </label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value) =>
                      setFilters({ ...filters, dateRange: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("shiftSearch.allUpcoming")}
                      </SelectItem>
                      <SelectItem value="today">
                        {t("shiftSearch.today")}
                      </SelectItem>
                      <SelectItem value="week">
                        {t("shiftSearch.thisWeek")}
                      </SelectItem>
                      <SelectItem value="month">
                        {t("shiftSearch.thisMonth")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                >
                  {t("dashboard.filters.clearFilters")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Shift Cards */}
        {isLoading ? (
          <div className="space-y-3">
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t("dashboard.noShifts")}
            description={
              profile?.verification_status !== "verified"
                ? t("dashboard.needsVerification")
                : t("dashboard.noShiftsDesc")
            }
            action={
              profile?.verification_status !== "verified" ? (
                <Button asChild>
                  <Link to="/profile/professional?tab=documents">
                    <Upload className="w-4 h-4 me-2" />
                    {t("profile.uploadDocument")}
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {shifts
              .filter(
                (shift) =>
                  shift.title
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  shift.role_required
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  shift.clinic?.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()),
              )
              .map((shift, index) => (
                <motion.div
                  key={shift.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedShift(shift);
                    setShowShiftDetail(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {shift.clinic?.name || t("nav.forClinics")}
                          </h3>
                          {shift.is_urgent && (
                            <Badge variant="destructive" className="text-xs">
                              {t("common.urgent")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {shift.role_required}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(shift.shift_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {shift.start_time} - {shift.end_time}
                          </span>
                          {shift.location_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {shift.location_address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">
                        {formatHourlyRate(
                          shift.hourly_rate,
                          language,
                          shift.currency,
                        )}
                      </p>
                      <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        open={showShiftDetail}
        onOpenChange={setShowShiftDetail}
        shift={selectedShift}
        profileId={profile?.id || ""}
        verificationStatus={profile?.verification_status || "pending"}
      />
    </main>
  );
};

export default ProfessionalDashboard;

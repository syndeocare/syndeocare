import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  Star,
  CheckCircle2,
  User,
  MessageCircle,
  Filter,
  X,
  DollarSign,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  isPlatformBackendConfigured,
  listLegacyProfessionals,
} from "@/lib/platform-backend";
import {
  DEFAULT_SPECIALTY_OPTIONS,
  fetchActiveSpecialtyNames,
} from "@/lib/admin-catalogs";

interface Professional {
  id: string;
  user_id?: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  qualifications: string[] | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_status: string | null;
  is_available: boolean | null;
  location_address: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}

export default function SearchProfessionals() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isRTL = i18n.language === "ar";

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [specialtyOptions, setSpecialtyOptions] = useState(
    DEFAULT_SPECIALTY_OPTIONS,
  );

  // Fetch clinic ID for current user if they're a clinic
  useEffect(() => {
    const fetchClinicId = async () => {
      if (user && userRole === "clinic") {
        const { data } = await backendDb
          .from("clinics")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (data) setClinicId(data.id);
      }
    };
    fetchClinicId();
  }, [user, userRole]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    specialty: "all",
    minRate: 0,
    maxRate: 200,
    minRating: 0,
    availableOnly: false,
    verifiedOnly: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchProfessionals();
  }, []);

  useEffect(() => {
    void fetchActiveSpecialtyNames().then(setSpecialtyOptions);
  }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      if (isPlatformBackendConfigured()) {
        const data = await listLegacyProfessionals();
        setProfessionals(data);
        return;
      }

      const { data, error } = await backendDb
        .from("profiles")
        .select("*")
        .eq("onboarding_completed", true)
        .order("rating_avg", { ascending: false });

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Error fetching professionals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter((pro) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = pro.full_name?.toLowerCase().includes(query);
      const matchesSpecialties = pro.specialties?.some((s) =>
        s.toLowerCase().includes(query),
      );
      const matchesBio = pro.bio?.toLowerCase().includes(query);
      if (!matchesName && !matchesSpecialties && !matchesBio) return false;
    }

    // Specialty filter
    if (filters.specialty !== "all") {
      if (!pro.specialties?.includes(filters.specialty)) return false;
    }

    // Rate filter
    if (pro.hourly_rate) {
      if (
        pro.hourly_rate < filters.minRate ||
        pro.hourly_rate > filters.maxRate
      )
        return false;
    }

    // Rating filter
    if (filters.minRating > 0) {
      if (!pro.rating_avg || pro.rating_avg < filters.minRating) return false;
    }

    // Available only filter
    if (filters.availableOnly && !pro.is_available) return false;

    // Verified only filter
    if (filters.verifiedOnly && pro.verification_status !== "verified")
      return false;

    return true;
  });

  const clearFilters = () => {
    setFilters({
      specialty: "all",
      minRate: 0,
      maxRate: 200,
      minRating: 0,
      availableOnly: false,
      verifiedOnly: false,
    });
    setSearchQuery("");
  };

  const hasActiveFilters =
    filters.specialty !== "all" ||
    filters.minRate > 0 ||
    filters.maxRate < 200 ||
    filters.minRating > 0 ||
    filters.availableOnly ||
    filters.verifiedOnly ||
    searchQuery;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Specialty */}
      <div className="space-y-2">
        <Label>{t("searchProfessionals.specialty")}</Label>
        <Select
          value={filters.specialty}
          onValueChange={(v) => setFilters({ ...filters, specialty: v })}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("searchProfessionals.allSpecialties")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("searchProfessionals.allSpecialties")}
            </SelectItem>
            {specialtyOptions.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>
                {specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hourly Rate Range */}
      <div className="space-y-3">
        <Label>{t("searchProfessionals.hourlyRate")}</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>${filters.minRate}</span>
          <span>-</span>
          <span>${filters.maxRate}</span>
        </div>
        <div className="pt-2">
          <Slider
            value={[filters.minRate, filters.maxRate]}
            onValueChange={([min, max]) =>
              setFilters({ ...filters, minRate: min, maxRate: max })
            }
            min={0}
            max={200}
            step={5}
            className="w-full"
          />
        </div>
      </div>

      {/* Minimum Rating */}
      <div className="space-y-3">
        <Label>{t("searchProfessionals.minRating")}</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() =>
                setFilters({
                  ...filters,
                  minRating: filters.minRating === star ? 0 : star,
                })
              }
              className={`p-1 rounded transition-colors ${
                star <= filters.minRating
                  ? "text-warning"
                  : "text-muted-foreground/30"
              }`}
            >
              <Star className="h-6 w-6 fill-current" />
            </button>
          ))}
          {filters.minRating > 0 && (
            <span className="text-sm text-muted-foreground ms-2">
              {filters.minRating}+
            </span>
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="availableOnly">
            {t("searchProfessionals.availableOnly")}
          </Label>
          <Switch
            id="availableOnly"
            checked={filters.availableOnly}
            onCheckedChange={(v) =>
              setFilters({ ...filters, availableOnly: v })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="verifiedOnly">
            {t("searchProfessionals.verifiedOnly")}
          </Label>
          <Switch
            id="verifiedOnly"
            checked={filters.verifiedOnly}
            onCheckedChange={(v) => setFilters({ ...filters, verifiedOnly: v })}
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 me-2" />
          {t("searchProfessionals.clearFilters")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="container py-6 md:py-10" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t("searchProfessionals.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("searchProfessionals.subtitle")}
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchProfessionals.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:flex gap-2">
          <Select
            value={filters.specialty}
            onValueChange={(v) => setFilters({ ...filters, specialty: v })}
          >
            <SelectTrigger className="w-48">
              <SelectValue
                placeholder={t("searchProfessionals.allSpecialties")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("searchProfessionals.allSpecialties")}
              </SelectItem>
              {specialtyOptions.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 me-2" />
                {t("searchProfessionals.moreFilters")}
                {hasActiveFilters && (
                  <span className="absolute -top-1 -end-1 h-3 w-3 bg-primary rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "left" : "right"}>
              <SheetHeader>
                <SheetTitle>{t("searchProfessionals.filters")}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Filter Button */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 me-2" />
              {t("searchProfessionals.filters")}
              {hasActiveFilters && (
                <span className="absolute -top-1 -end-1 h-3 w-3 bg-primary rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side={isRTL ? "left" : "right"}>
            <SheetHeader>
              <SheetTitle>{t("searchProfessionals.filters")}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-4">
        {t("searchProfessionals.resultsCount", {
          count: filteredProfessionals.length,
        })}
      </p>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t("searchProfessionals.noResults")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("searchProfessionals.tryAdjusting")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                {t("searchProfessionals.clearFilters")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((pro) => (
            <Card key={pro.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage
                      src={pro.avatar_url || undefined}
                      alt={pro.full_name}
                    />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {pro.full_name}
                      </h3>
                      {pro.verification_status === "verified" && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {pro.rating_avg ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {pro.rating_avg.toFixed(1)}
                          {pro.rating_count && (
                            <span>({pro.rating_count})</span>
                          )}
                        </span>
                      ) : null}
                      {pro.hourly_rate && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {pro.hourly_rate}/hr
                        </span>
                      )}
                    </div>
                    {pro.specialties && pro.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {pro.specialties.slice(0, 2).map((spec) => (
                          <Badge
                            key={spec}
                            variant="secondary"
                            className="text-xs"
                          >
                            {spec}
                          </Badge>
                        ))}
                        {pro.specialties.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{pro.specialties.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    {pro.location_address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {pro.location_address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/professional/${pro.id}`)}
                  >
                    {t("searchProfessionals.viewProfile")}
                  </Button>
                  {user && userRole === "clinic" && clinicId && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      disabled={startingChat === pro.id}
                      onClick={async () => {
                        setStartingChat(pro.id);
                        try {
                          // Check if conversation exists
                          const { data: existing, error: fetchError } =
                            await backendDb
                              .from("conversations")
                              .select("id")
                              .eq("professional_id", pro.id)
                              .eq("clinic_id", clinicId)
                              .single();

                          if (fetchError && fetchError.code !== "PGRST116")
                            throw fetchError;

                          let conversationId = existing?.id;

                          if (!conversationId) {
                            const { data: newConv, error: createError } =
                              await backendDb
                                .from("conversations")
                                .insert({
                                  professional_id: pro.id,
                                  clinic_id: clinicId,
                                })
                                .select("id")
                                .single();
                            if (createError) throw createError;
                            conversationId = newConv.id;
                          }

                          navigate(`/messages?conversation=${conversationId}`);
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: t("chat.startError"),
                            description:
                              error instanceof Error
                                ? error.message
                                : t("chat.startError"),
                          });
                        } finally {
                          setStartingChat(null);
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4 me-1" />
                      {t("searchProfessionals.message")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

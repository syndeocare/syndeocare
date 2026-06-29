import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Screen,
  SectionHeader,
  colors,
  fonts,
  useThemePalette,
  useTextStyles,
} from "../../src/components/ui";
import { AppHeaderActions } from "../../src/components/AppHeaderActions";
import {
  createBooking,
  createJob,
  getMyClinicProfile,
  listCatalogItems,
  listBookings,
  listJobs,
  listProfessionals,
  startConversation,
  updateBookingStatus,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import {
  displayLabel,
  formatMoney,
  formatShiftWindow,
} from "../../src/lib/format";
import { usePreferences, useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";
import type { CatalogItem, Job, JobCreateInput } from "../../src/types";

function activeCatalogItems(items?: CatalogItem[]) {
  return (items ?? [])
    .filter((item) => item.isActive)
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
}

function dateTimeToIso(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function splitLocation(
  value: string,
  fallback?: { city?: string; region?: string },
) {
  const [city, region] = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: city || fallback?.city || "",
    latitude: 0,
    longitude: 0,
    region: region || fallback?.region || "Yemen",
  };
}

export default function ShiftsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const t = useT();
  const { direction, language } = usePreferences();
  const text = useTextStyles();
  const palette = useThemePalette();
  const { width } = useWindowDimensions();
  const isRTL = direction === "rtl";
  const isNarrow = width < 440;
  const professionalCanApply =
    session?.principal.role !== "professional" ||
    (session.principal.verificationStatus === "approved" &&
      session.principal.onboardingCompleted);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proposal, setProposal] = useState("");
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [clinicView, setClinicView] = useState<
    "applications" | "professionals" | "shifts"
  >("shifts");
  const [createStep, setCreateStep] = useState<
    "details" | "requirements" | "review"
  >("details");
  const [roleSearch, setRoleSearch] = useState("");
  const [certificationSearch, setCertificationSearch] = useState("");
  const [shiftDraft, setShiftDraft] = useState({
    amount: "",
    description: "",
    endTime: "16:00",
    isUrgent: false,
    locationAddress: "",
    requiredCertifications: [] as string[],
    role: "",
    shiftDate: "",
    startTime: "08:00",
    summary: "",
    title: "",
  });

  const jobsQuery = useQuery({ queryFn: listJobs, queryKey: ["jobs"] });
  const bookingsQuery = useQuery({
    queryFn: listBookings,
    queryKey: ["bookings"],
  });
  const professionalsQuery = useQuery({
    enabled: session?.principal.role === "clinic",
    queryFn: () => listProfessionals({ verificationStatus: "approved" }),
    queryKey: ["professionals", "approved"],
  });
  const clinicProfileQuery = useQuery({
    enabled: session?.principal.role === "clinic",
    queryFn: getMyClinicProfile,
    queryKey: ["profile", "clinic", "shift-create"],
  });
  const rolesQuery = useQuery({
    enabled: session?.principal.role === "clinic" && showCreateShift,
    queryFn: () => listCatalogItems("job_role"),
    queryKey: ["catalog", "job_role"],
  });
  const certificationsQuery = useQuery({
    enabled: session?.principal.role === "clinic" && showCreateShift,
    queryFn: () => listCatalogItems("certification"),
    queryKey: ["catalog", "certification"],
  });

  const roleOptions = activeCatalogItems(rolesQuery.data?.items);
  const certificationOptions = activeCatalogItems(
    certificationsQuery.data?.items,
  );
  const filteredRoleOptions = roleOptions.filter((item) =>
    `${item.name} ${item.nameAr ?? ""}`
      .toLowerCase()
      .includes(roleSearch.trim().toLowerCase()),
  );
  const filteredCertificationOptions = certificationOptions.filter((item) =>
    `${item.name} ${item.nameAr ?? ""}`
      .toLowerCase()
      .includes(certificationSearch.trim().toLowerCase()),
  );

  const appliedJobIds = useMemo(
    () =>
      new Set(bookingsQuery.data?.items.map((booking) => booking.jobId) ?? []),
    [bookingsQuery.data?.items],
  );
  const verifiedProfessionals = useMemo(
    () =>
      (professionalsQuery.data?.items ?? []).filter(
        (professional) =>
          professional.verificationStatus === "approved" &&
          professional.onboardingCompleted,
      ),
    [professionalsQuery.data?.items],
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJob) return;
      await createBooking(selectedJob.id, proposal);
    },
    onSuccess: async () => {
      setSelectedJob(null);
      setProposal("");
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
  const createShiftMutation = useMutation({
    mutationFn: async () => {
      const shiftDate = parseDateInput(shiftDraft.shiftDate);
      const amount = Number(shiftDraft.amount);

      if (!shiftDraft.role.trim()) throw new Error(t("shifts.roleRequired"));
      if (!shiftDraft.shiftDate.trim()) {
        throw new Error(t("shifts.shiftDateRequired"));
      }
      if (!shiftDate) {
        throw new Error(t("shifts.shiftDateRequired"));
      }
      if (shiftDate < startOfToday()) {
        throw new Error(t("shifts.shiftDatePast"));
      }

      const startsAtIso = dateTimeToIso(
        shiftDraft.shiftDate,
        shiftDraft.startTime,
      );
      const endsAtIso = dateTimeToIso(shiftDraft.shiftDate, shiftDraft.endTime);

      if (!startsAtIso) {
        throw new Error(t("shifts.startsAtRequired"));
      }
      if (!endsAtIso) {
        throw new Error(t("shifts.endsAtInvalid"));
      }

      const startsAt = new Date(startsAtIso);
      const endsAt = new Date(endsAtIso);

      if (endsAt <= startsAt) {
        throw new Error(t("shifts.endsAtInvalid"));
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(t("shifts.amountInvalid"));
      }
      if (
        !shiftDraft.locationAddress.trim() &&
        !clinicProfileQuery.data?.city
      ) {
        throw new Error(t("shifts.locationRequired"));
      }

      const location = splitLocation(shiftDraft.locationAddress, {
        city: clinicProfileQuery.data?.city,
        region: clinicProfileQuery.data?.region,
      });
      if (!location.city) throw new Error(t("shifts.locationRequired"));

      const requirements = [
        ...shiftDraft.requiredCertifications,
        shiftDraft.isUrgent ? t("shifts.urgentCoverage") : null,
        `${t("shifts.qualifiedFor")} ${shiftDraft.role}`,
      ].filter(Boolean) as string[];

      const input: JobCreateInput = {
        compensation: {
          amount,
          currency: "USD",
          unit: "hour",
        },
        contactPreference: "in_app_chat",
        description: shiftDraft.description.trim() || shiftDraft.summary.trim(),
        employmentType: "temporary_shift",
        endsAt: endsAt.toISOString(),
        languages: ["ar", "en"],
        location,
        requirements,
        specialty: shiftDraft.role.trim(),
        startsAt: startsAtIso,
        summary: shiftDraft.summary.trim() || shiftDraft.description.trim(),
        title: shiftDraft.title.trim() || shiftDraft.role.trim(),
        verificationRequired: true,
      };

      if (
        !input.description ||
        !input.summary ||
        input.requirements.length === 0
      ) {
        throw new Error(t("shifts.detailsRequired"));
      }

      return createJob(input);
    },
    onSuccess: async () => {
      setShowCreateShift(false);
      setCreateStep("details");
      setShiftDraft({
        amount: "",
        description: "",
        endTime: "16:00",
        isUrgent: false,
        locationAddress: "",
        requiredCertifications: [],
        role: "",
        shiftDate: "",
        startTime: "08:00",
        summary: "",
        title: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
  const bookingStatusMutation = useMutation({
    mutationFn: ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: "accepted" | "cancelled";
    }) => updateBookingStatus(bookingId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: (professionalId: string) => {
      const clinicId = session?.principal.clinicId;
      if (!clinicId) throw new Error(t("shifts.clinicNotReady"));
      return startConversation({ clinicId, professionalId });
    },
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push({
        params: { id: conversation.id, name: conversation.displayName },
        pathname: "/conversation/[id]",
      });
    },
  });

  const refetch = () => {
    void jobsQuery.refetch();
    void bookingsQuery.refetch();
    void professionalsQuery.refetch();
  };

  return (
    <Screen
      headerEnd={<AppHeaderActions />}
      onRefresh={refetch}
      refreshing={jobsQuery.isFetching || bookingsQuery.isFetching}
      title={t("shifts.title")}
    >
      {jobsQuery.isLoading ? (
        <LoadingBlock label={t("shifts.loading")} />
      ) : null}
      <ErrorBanner
        message={
          jobsQuery.error instanceof Error
            ? displayLabel(jobsQuery.error.message, language)
            : bookingsQuery.error instanceof Error
              ? displayLabel(bookingsQuery.error.message, language)
              : professionalsQuery.error instanceof Error
                ? displayLabel(professionalsQuery.error.message, language)
                : rolesQuery.error instanceof Error
                  ? displayLabel(rolesQuery.error.message, language)
                  : certificationsQuery.error instanceof Error
                    ? displayLabel(certificationsQuery.error.message, language)
                    : applyMutation.error instanceof Error
                      ? displayLabel(applyMutation.error.message, language)
                      : messageMutation.error instanceof Error
                        ? displayLabel(messageMutation.error.message, language)
                        : createShiftMutation.error instanceof Error
                          ? displayLabel(
                              createShiftMutation.error.message,
                              language,
                            )
                          : bookingStatusMutation.error instanceof Error
                            ? displayLabel(
                                bookingStatusMutation.error.message,
                                language,
                              )
                            : undefined
        }
      />

      {session?.principal.role === "clinic" ? (
        <>
          <Card>
            <View style={[styles.ctaTop, isRTL && styles.rowReverse]}>
              <View
                style={[
                  styles.iconShell,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Plus color={colors.primaryDark} size={20} />
              </View>
              <View style={styles.grow}>
                <Text style={text.h2}>{t("shifts.createShift")}</Text>
                <Text style={text.body}>{t("shifts.createShiftBody")}</Text>
              </View>
            </View>
            <Button onPress={() => setShowCreateShift(true)}>
              {t("shifts.createShift")}
            </Button>
          </Card>
          <View
            style={[
              styles.segmented,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.border,
              },
            ]}
          >
            {(["shifts", "applications", "professionals"] as const).map(
              (view) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: clinicView === view }}
                  key={view}
                  onPress={() => setClinicView(view)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        clinicView === view ? palette.surface : "transparent",
                    },
                    clinicView === view && {
                      shadowColor: palette.shadow,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          clinicView === view ? colors.primary : palette.muted,
                        fontFamily:
                          language === "ar" ? fonts.arabicBold : fonts.bodyBold,
                      },
                    ]}
                  >
                    {t(`shifts.view.${view}`)}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </>
      ) : null}

      {session?.principal.role === "clinic" && clinicView === "applications" ? (
        <>
          <SectionHeader title={t("shifts.applicationsTitle")} />
          {bookingsQuery.data?.items.length ? (
            bookingsQuery.data.items.map((booking) => (
              <Card key={booking.id}>
                <View style={[styles.row, isRTL && styles.rowReverse]}>
                  <Avatar label={booking.professionalName} size={46} />
                  <View style={styles.grow}>
                    <Text style={text.h2}>{booking.professionalName}</Text>
                    <Text style={text.body}>{booking.jobTitle}</Text>
                    <Text style={text.body}>
                      {displayLabel(booking.location.city, language)}
                      {language === "ar" ? "، " : ", "}
                      {displayLabel(booking.location.region, language)}
                    </Text>
                    {booking.notes ? (
                      <Text style={text.body}>{booking.notes}</Text>
                    ) : null}
                  </View>
                  <Badge
                    tone={
                      booking.status === "accepted" ||
                      booking.status === "confirmed"
                        ? "success"
                        : booking.status === "cancelled"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {displayLabel(booking.status, language)}
                  </Badge>
                </View>
                {booking.status === "requested" ? (
                  <View style={styles.actions}>
                    <Button
                      loading={bookingStatusMutation.isPending}
                      onPress={() =>
                        bookingStatusMutation.mutate({
                          bookingId: booking.id,
                          status: "accepted",
                        })
                      }
                    >
                      {t("shifts.accept")}
                    </Button>
                    <Button
                      loading={bookingStatusMutation.isPending}
                      onPress={() =>
                        bookingStatusMutation.mutate({
                          bookingId: booking.id,
                          status: "cancelled",
                        })
                      }
                      tone="danger"
                    >
                      {t("shifts.decline")}
                    </Button>
                  </View>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState
              body={t("shifts.noApplicationsBody")}
              title={t("shifts.noApplicationsTitle")}
            />
          )}
        </>
      ) : null}

      {session?.principal.role === "clinic" &&
      clinicView === "professionals" ? (
        <>
          <SectionHeader title={t("shifts.inviteTitle")} />
          {professionalsQuery.isLoading ? (
            <LoadingBlock label={t("shifts.loadingProfessionals")} />
          ) : null}
          {!professionalsQuery.isLoading && verifiedProfessionals.length ? (
            verifiedProfessionals.map((professional) => (
              <Card key={professional.id}>
                <View style={[styles.row, isRTL && styles.rowReverse]}>
                  <Avatar label={professional.fullName} size={46} />
                  <View style={styles.grow}>
                    <Text style={text.h2}>{professional.fullName}</Text>
                    <Text style={text.body}>
                      {displayLabel(professional.specialty, language)}
                    </Text>
                    <Text style={text.body}>
                      {displayLabel(professional.city, language)}
                      {language === "ar" ? "، " : ", "}
                      {displayLabel(professional.region, language)}
                    </Text>
                  </View>
                  <Badge tone="success">{t("verification.approved")}</Badge>
                </View>
                <Button
                  loading={messageMutation.isPending}
                  onPress={() => messageMutation.mutate(professional.id)}
                  tone="secondary"
                >
                  {t("shifts.startMessage")}
                </Button>
              </Card>
            ))
          ) : !professionalsQuery.isLoading ? (
            <EmptyState
              body={t("shifts.noVerifiedProfessionalsBody")}
              title={t("shifts.noVerifiedProfessionalsTitle")}
            />
          ) : null}
        </>
      ) : null}

      {session?.principal.role !== "clinic" || clinicView === "shifts" ? (
        <>
          <SectionHeader title={t("dashboard.openShifts")} />
          {jobsQuery.data?.items.length ? (
            jobsQuery.data.items.map((job) => {
              const applied = appliedJobIds.has(job.id);
              return (
                <Card key={job.id}>
                  <View style={[styles.row, isRTL && styles.rowReverse]}>
                    <View
                      style={[
                        styles.iconShell,
                        { backgroundColor: palette.surfaceMuted },
                      ]}
                    >
                      <CalendarClock color={colors.accentDark} size={20} />
                    </View>
                    <View style={styles.grow}>
                      <Text style={text.h2}>
                        {displayLabel(job.title, language)}
                      </Text>
                      <Text style={text.body}>
                        {displayLabel(job.specialty, language)}
                      </Text>
                    </View>
                    <Badge tone={job.status === "open" ? "success" : "warning"}>
                      {displayLabel(job.status, language)}
                    </Badge>
                  </View>
                  <View style={[styles.metaLine, isRTL && styles.rowReverse]}>
                    <MapPin color={colors.muted} size={16} />
                    <Text style={text.body}>
                      {displayLabel(job.location.city, language)}
                      {language === "ar" ? "، " : ", "}
                      {displayLabel(job.location.region, language)}
                    </Text>
                  </View>
                  <View style={[styles.metaLine, isRTL && styles.rowReverse]}>
                    <CalendarClock color={colors.muted} size={16} />
                    <Text style={text.body}>
                      {formatShiftWindow(job, language)}
                    </Text>
                  </View>
                  <Text style={text.strong}>
                    {formatMoney(job.compensation, language)}
                  </Text>
                  <Text style={text.body}>
                    {displayLabel(job.summary, language)}
                  </Text>
                  {session?.principal.role === "professional" &&
                  !professionalCanApply ? (
                    <View
                      style={[
                        styles.notice,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor: palette.border,
                        },
                        isRTL && styles.rowReverse,
                      ]}
                    >
                      <AlertCircle color={colors.warning} size={18} />
                      <View style={styles.grow}>
                        <Text style={text.strong}>
                          {t("shifts.verificationRequiredTitle")}
                        </Text>
                        <Text style={text.body}>
                          {t("shifts.verificationRequiredBody")}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {session?.principal.role === "professional" ? (
                    <Button
                      disabled={
                        !professionalCanApply ||
                        applied ||
                        job.status !== "open"
                      }
                      onPress={() => {
                        if (!professionalCanApply) return;
                        setSelectedJob(job);
                      }}
                    >
                      {!professionalCanApply
                        ? t("shifts.waitForVerification")
                        : applied
                          ? t("shifts.alreadyApplied")
                          : t("shifts.applyProposal")}
                    </Button>
                  ) : null}
                </Card>
              );
            })
          ) : (
            <EmptyState
              body={t("shifts.noOpenBody")}
              title={t("shifts.noOpenTitle")}
            />
          )}
        </>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedJob(null)}
        transparent
        visible={Boolean(selectedJob)}
      >
        <View style={styles.modalShade}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboard}
          >
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={text.h2}>{t("shifts.applyTitle")}</Text>
              <Text style={text.body}>{t("shifts.applyBody")}</Text>
              <Field
                label={t("shifts.proposal")}
                multiline
                onChangeText={setProposal}
                placeholder={t("shifts.proposalPlaceholder")}
                returnKeyType="default"
                value={proposal}
              />
              <Button
                loading={applyMutation.isPending}
                onPress={() => applyMutation.mutate()}
              >
                {t("shifts.submitApplication")}
              </Button>
              <Pressable
                onPress={() => setSelectedJob(null)}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>{t("shifts.cancel")}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setShowCreateShift(false)}
        transparent
        visible={showCreateShift}
      >
        <View style={styles.modalShade}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboard}
          >
            <View
              style={[styles.modalSheet, { backgroundColor: palette.surface }]}
            >
              <ScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={text.h2}>{t("shifts.createShift")}</Text>
                <Text style={text.body}>{t("shifts.createShiftBody")}</Text>
                <StepDots current={createStep} />
                {createStep === "details" ? (
                  <>
                    {rolesQuery.isLoading ? (
                      <LoadingBlock label={t("shifts.loadingRoles")} />
                    ) : null}
                    <Field
                      label={t("shifts.searchRole")}
                      leftIcon={<Search color={colors.muted} size={18} />}
                      onChangeText={setRoleSearch}
                      returnKeyType="search"
                      value={roleSearch}
                    />
                    <CatalogChips
                      emptyLabel={t("shifts.noRoles")}
                      items={filteredRoleOptions}
                      onSelect={(item) =>
                        setShiftDraft((draft) => ({
                          ...draft,
                          role: item.name,
                          title: draft.title || item.name,
                        }))
                      }
                      selectedValues={[shiftDraft.role]}
                    />
                    <Field
                      label={t("shifts.shiftTitle")}
                      onChangeText={(value) =>
                        setShiftDraft((draft) => ({ ...draft, title: value }))
                      }
                      returnKeyType="next"
                      value={shiftDraft.title}
                    />
                    <View
                      style={[styles.twoColumn, isNarrow && styles.oneColumn]}
                    >
                      <DatePickerField
                        label={t("shifts.shiftDate")}
                        minimumDate={startOfToday()}
                        onChange={(value) =>
                          setShiftDraft((draft) => ({
                            ...draft,
                            shiftDate: value,
                          }))
                        }
                        value={shiftDraft.shiftDate}
                      />
                      <Field
                        keyboardType="decimal-pad"
                        label={t("shifts.hourlyRate")}
                        onChangeText={(value) =>
                          setShiftDraft((draft) => ({
                            ...draft,
                            amount: value,
                          }))
                        }
                        returnKeyType="next"
                        value={shiftDraft.amount}
                      />
                    </View>
                    <View
                      style={[styles.twoColumn, isNarrow && styles.oneColumn]}
                    >
                      <Field
                        autoComplete="off"
                        label={t("shifts.startTime")}
                        onChangeText={(value) =>
                          setShiftDraft((draft) => ({
                            ...draft,
                            startTime: value,
                          }))
                        }
                        placeholder="08:00"
                        returnKeyType="next"
                        value={shiftDraft.startTime}
                      />
                      <Field
                        autoComplete="off"
                        label={t("shifts.endTime")}
                        onChangeText={(value) =>
                          setShiftDraft((draft) => ({
                            ...draft,
                            endTime: value,
                          }))
                        }
                        placeholder="16:00"
                        returnKeyType="next"
                        value={shiftDraft.endTime}
                      />
                    </View>
                    <Field
                      label={t("shifts.location")}
                      onChangeText={(value) =>
                        setShiftDraft((draft) => ({
                          ...draft,
                          locationAddress: value,
                        }))
                      }
                      placeholder={t("shifts.locationPlaceholder")}
                      returnKeyType="next"
                      value={shiftDraft.locationAddress}
                    />
                  </>
                ) : null}
                {createStep === "requirements" ? (
                  <>
                    <Field
                      label={t("shifts.summary")}
                      multiline
                      onChangeText={(value) =>
                        setShiftDraft((draft) => ({ ...draft, summary: value }))
                      }
                      returnKeyType="default"
                      value={shiftDraft.summary}
                    />
                    <Field
                      label={t("shifts.description")}
                      multiline
                      onChangeText={(value) =>
                        setShiftDraft((draft) => ({
                          ...draft,
                          description: value,
                        }))
                      }
                      returnKeyType="default"
                      value={shiftDraft.description}
                    />
                    {certificationsQuery.isLoading ? (
                      <LoadingBlock label={t("shifts.loadingCertifications")} />
                    ) : null}
                    <Field
                      label={t("shifts.searchCertifications")}
                      leftIcon={<Search color={colors.muted} size={18} />}
                      onChangeText={setCertificationSearch}
                      returnKeyType="search"
                      value={certificationSearch}
                    />
                    <CatalogChips
                      emptyLabel={t("shifts.noCertifications")}
                      items={filteredCertificationOptions}
                      multiple
                      onSelect={(item) =>
                        setShiftDraft((draft) => ({
                          ...draft,
                          requiredCertifications:
                            draft.requiredCertifications.includes(item.name)
                              ? draft.requiredCertifications.filter(
                                  (name) => name !== item.name,
                                )
                              : [...draft.requiredCertifications, item.name],
                        }))
                      }
                      selectedValues={shiftDraft.requiredCertifications}
                    />
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityState={{ checked: shiftDraft.isUrgent }}
                      onPress={() =>
                        setShiftDraft((draft) => ({
                          ...draft,
                          isUrgent: !draft.isUrgent,
                        }))
                      }
                      style={[
                        styles.urgentRow,
                        {
                          backgroundColor: shiftDraft.isUrgent
                            ? colors.dangerSoft
                            : palette.surfaceMuted,
                          borderColor: shiftDraft.isUrgent
                            ? "#FCA5A5"
                            : palette.border,
                        },
                      ]}
                    >
                      <AlertCircle
                        color={
                          shiftDraft.isUrgent ? colors.danger : colors.muted
                        }
                        size={20}
                      />
                      <View style={styles.grow}>
                        <Text style={text.strong}>
                          {t("shifts.markUrgent")}
                        </Text>
                        <Text style={text.body}>{t("shifts.urgentHint")}</Text>
                      </View>
                      {shiftDraft.isUrgent ? (
                        <Check color={colors.danger} size={20} />
                      ) : null}
                    </Pressable>
                  </>
                ) : null}
                {createStep === "review" ? (
                  <Card tone="muted">
                    <ReviewRow
                      label={t("shifts.specialty")}
                      value={displayLabel(shiftDraft.role, language)}
                    />
                    <ReviewRow
                      label={t("shifts.shiftTitle")}
                      value={displayLabel(
                        shiftDraft.title || shiftDraft.role,
                        language,
                      )}
                    />
                    <ReviewRow
                      label={t("shifts.startsAt")}
                      value={`${shiftDraft.shiftDate} ${shiftDraft.startTime}`}
                    />
                    <ReviewRow
                      label={t("shifts.endsAt")}
                      value={`${shiftDraft.shiftDate} ${shiftDraft.endTime}`}
                    />
                    <ReviewRow
                      label={t("shifts.location")}
                      value={displayLabel(
                        shiftDraft.locationAddress ||
                          `${clinicProfileQuery.data?.city ?? ""}, ${
                            clinicProfileQuery.data?.region ?? ""
                          }`,
                        language,
                      )}
                    />
                    <ReviewRow
                      label={t("shifts.requirements")}
                      value={
                        shiftDraft.requiredCertifications
                          .map((item) => displayLabel(item, language))
                          .join(language === "ar" ? "، " : ", ") ||
                        t("shifts.noOptionalRequirements")
                      }
                    />
                  </Card>
                ) : null}
              </ScrollView>
              <View style={styles.stepActions}>
                {createStep !== "details" ? (
                  <Button
                    onPress={() =>
                      setCreateStep(
                        createStep === "review" ? "requirements" : "details",
                      )
                    }
                    tone="secondary"
                  >
                    {t("shifts.back")}
                  </Button>
                ) : null}
                {createStep !== "review" ? (
                  <Button
                    disabled={
                      createStep === "details" &&
                      (!shiftDraft.role ||
                        !parseDateInput(shiftDraft.shiftDate) ||
                        (parseDateInput(shiftDraft.shiftDate) ??
                          startOfToday()) < startOfToday() ||
                        rolesQuery.isLoading ||
                        rolesQuery.isError ||
                        roleOptions.length === 0)
                    }
                    onPress={() =>
                      setCreateStep(
                        createStep === "details" ? "requirements" : "review",
                      )
                    }
                  >
                    {t("shifts.next")}
                  </Button>
                ) : (
                  <Button
                    loading={createShiftMutation.isPending}
                    onPress={() => createShiftMutation.mutate()}
                  >
                    {t("shifts.publishShift")}
                  </Button>
                )}
              </View>
              <Pressable
                onPress={() => setShowCreateShift(false)}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>{t("shifts.cancel")}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

function StepDots({
  current,
}: {
  current: "details" | "requirements" | "review";
}) {
  const steps: (typeof current)[] = ["details", "requirements", "review"];
  return (
    <View style={styles.stepDots}>
      {steps.map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            step === current ? styles.stepDotActive : undefined,
          ]}
        />
      ))}
    </View>
  );
}

function CatalogChips({
  emptyLabel,
  items,
  multiple,
  onSelect,
  selectedValues,
}: {
  emptyLabel: string;
  items: CatalogItem[];
  multiple?: boolean;
  onSelect: (item: CatalogItem) => void;
  selectedValues: string[];
}) {
  const palette = useThemePalette();
  const textStyles = useTextStyles();
  const { language } = usePreferences();

  if (items.length === 0) {
    return <Text style={textStyles.body}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.chipGrid}>
      {items.map((item) => {
        const selected = selectedValues.includes(item.name);
        const label =
          language === "ar" && item.nameAr
            ? item.nameAr
            : displayLabel(item.name, language);
        return (
          <Pressable
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={{ checked: selected }}
            key={item.id}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.choiceChip,
              {
                backgroundColor: selected
                  ? colors.primarySoft
                  : palette.surface,
                borderColor: selected ? colors.primary : palette.border,
              },
              pressed && styles.pressedChip,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                { color: selected ? colors.primaryDark : palette.text },
              ]}
            >
              {label}
            </Text>
            {selected ? <X color={colors.primaryDark} size={14} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const textStyles = useTextStyles();
  return (
    <View style={styles.reviewRow}>
      <Text style={textStyles.body}>{label}</Text>
      <Text style={[textStyles.strong, styles.reviewValue]}>{value}</Text>
    </View>
  );
}

function DatePickerField({
  label,
  minimumDate,
  onChange,
  value,
}: {
  label: string;
  minimumDate: Date;
  onChange: (value: string) => void;
  value: string;
}) {
  const t = useT();
  const textStyles = useTextStyles();
  const palette = useThemePalette();
  const { direction, language } = usePreferences();
  const isRTL = direction === "rtl";
  const selectedDate = parseDateInput(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(selectedDate ?? minimumDate);
  const monthStart = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const leadingBlanks = monthStart.getDay();
  const locale = language === "ar" ? "ar-YE" : "en";
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(monthStart);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2026, 5, 7 + index),
    ),
  );
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) =>
        new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1),
    ),
  ];

  return (
    <View style={styles.dateField}>
      <Text style={textStyles.strong}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.dateInput,
          { backgroundColor: palette.input, borderColor: palette.border },
          pressed && styles.pressedChip,
        ]}
      >
        <CalendarClock color={palette.placeholder} size={18} />
        <Text style={[styles.dateInputText, { color: palette.text }]}>
          {selectedDate
            ? new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(selectedDate)
            : t("shifts.selectDate")}
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.calendarShade}>
          <View
            style={[
              styles.calendarPanel,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={[styles.calendarHeader, isRTL && styles.rowReverse]}>
              <Pressable
                accessibilityLabel={t("shifts.previousMonth")}
                accessibilityRole="button"
                onPress={() => setVisibleMonth((month) => addMonths(month, -1))}
                style={styles.calendarNav}
              >
                {isRTL ? (
                  <ChevronRight color={palette.text} size={20} />
                ) : (
                  <ChevronLeft color={palette.text} size={20} />
                )}
              </Pressable>
              <Text style={textStyles.h2}>{monthLabel}</Text>
              <Pressable
                accessibilityLabel={t("shifts.nextMonth")}
                accessibilityRole="button"
                onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
                style={styles.calendarNav}
              >
                {isRTL ? (
                  <ChevronLeft color={palette.text} size={20} />
                ) : (
                  <ChevronRight color={palette.text} size={20} />
                )}
              </Pressable>
            </View>
            <View style={styles.weekdayGrid}>
              {weekdayLabels.map((weekday) => (
                <Text
                  key={weekday}
                  style={[styles.weekdayLabel, { color: palette.muted }]}
                >
                  {weekday}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {cells.map((date, index) => {
                const disabled = !date || date < minimumDate;
                const selected =
                  date && selectedDate
                    ? formatDateInput(date) === formatDateInput(selectedDate)
                    : false;
                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    key={date ? formatDateInput(date) : `blank-${index}`}
                    onPress={() => {
                      if (!date) return;
                      onChange(formatDateInput(date));
                      setIsOpen(false);
                    }}
                    style={[
                      styles.calendarDay,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : palette.surfaceMuted,
                        opacity: disabled ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        { color: selected ? "#ffffff" : palette.text },
                      ]}
                    >
                      {date
                        ? new Intl.NumberFormat(locale).format(date.getDate())
                        : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button onPress={() => setIsOpen(false)} tone="secondary">
              {t("common.cancel")}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cancel: {
    alignItems: "center",
    padding: 14,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: "800",
  },
  grow: {
    flex: 1,
  },
  actions: {
    gap: 10,
  },
  calendarDay: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: "13.2%",
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: "800",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarNav: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  calendarPanel: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    width: "92%",
  },
  calendarShade: {
    alignItems: "center",
    backgroundColor: "rgba(19, 13, 25, 0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  ctaTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 7,
  },
  dateInput: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  choiceChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: "800",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconShell: {
    alignItems: "center",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  notice: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  oneColumn: {
    flexDirection: "column",
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  modal: {
    borderWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 14,
    maxHeight: "88%",
    padding: 20,
  },
  modalScroll: {
    gap: 14,
    paddingBottom: 14,
  },
  modalKeyboard: {
    justifyContent: "flex-end",
    width: "100%",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 14,
    maxHeight: "88%",
    padding: 20,
  },
  modalShade: {
    backgroundColor: "rgba(19, 13, 25, 0.72)",
    flex: 1,
    justifyContent: "flex-end",
  },
  pressedChip: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  reviewRow: {
    borderBottomColor: "rgba(86,132,154,0.14)",
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 10,
  },
  reviewValue: {
    fontSize: 15,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  segment: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  segmentActive: {
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  segmented: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  stepActions: {
    gap: 10,
  },
  stepDot: {
    backgroundColor: "rgba(86,132,154,0.24)",
    borderRadius: 999,
    height: 7,
    width: 28,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 42,
  },
  stepDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },
  weekdayGrid: {
    flexDirection: "row",
    gap: 5,
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    width: "13.2%",
  },
  urgentRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
});

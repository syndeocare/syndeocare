import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  useThemePalette,
  useTextStyles,
} from "../../src/components/ui";
import {
  createBooking,
  createJob,
  listBookings,
  listJobs,
  listProfessionals,
  startConversation,
  updateBookingStatus,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { useT } from "../../src/lib/preferences";
import { queryClient } from "../../src/lib/query";
import type { Job, JobCreateInput } from "../../src/types";

function formatMoney(job: Job) {
  return `${job.compensation.amount} ${job.compensation.currency}/${job.compensation.unit}`;
}

function formatShiftWindow(job: Job) {
  const starts = new Date(job.startsAt);
  const ends = job.endsAt ? new Date(job.endsAt) : null;
  if (Number.isNaN(starts.getTime())) return "";
  const date = starts.toLocaleDateString();
  const startTime = starts.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime =
    ends && !Number.isNaN(ends.getTime())
      ? ends.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
  return endTime
    ? `${date} - ${startTime}-${endTime}`
    : `${date} - ${startTime}`;
}

export default function ShiftsScreen() {
  const { session } = useAuth();
  const t = useT();
  const text = useTextStyles();
  const palette = useThemePalette();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proposal, setProposal] = useState("");
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [shiftDraft, setShiftDraft] = useState({
    amount: "20",
    description: "",
    endsAt: "",
    requirements: "Active license",
    specialty: "Registered Nurse (RN)",
    startsAt: "",
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
    queryFn: listProfessionals,
    queryKey: ["professionals"],
  });

  const appliedJobIds = useMemo(
    () =>
      new Set(bookingsQuery.data?.items.map((booking) => booking.jobId) ?? []),
    [bookingsQuery.data?.items],
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
      const startsAt = new Date(shiftDraft.startsAt);
      const endsAt = shiftDraft.endsAt
        ? new Date(shiftDraft.endsAt)
        : undefined;
      const amount = Number(shiftDraft.amount);

      if (!shiftDraft.title.trim()) throw new Error(t("shifts.titleRequired"));
      if (Number.isNaN(startsAt.getTime())) {
        throw new Error(t("shifts.startsAtRequired"));
      }
      if (endsAt && Number.isNaN(endsAt.getTime())) {
        throw new Error(t("shifts.endsAtInvalid"));
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(t("shifts.amountInvalid"));
      }

      const input: JobCreateInput = {
        compensation: {
          amount,
          currency: "USD",
          unit: "hour",
        },
        contactPreference: "in_app_chat",
        description: shiftDraft.description.trim() || shiftDraft.summary.trim(),
        employmentType: "temporary_shift",
        endsAt: endsAt?.toISOString(),
        languages: ["ar", "en"],
        location: {
          city: "Aden",
          latitude: 12.7855,
          longitude: 45.0187,
          region: "Yemen",
        },
        requirements: shiftDraft.requirements
          .split(",")
          .map((requirement) => requirement.trim())
          .filter(Boolean),
        specialty: shiftDraft.specialty.trim(),
        startsAt: startsAt.toISOString(),
        summary: shiftDraft.summary.trim() || shiftDraft.description.trim(),
        title: shiftDraft.title.trim(),
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
      setShiftDraft({
        amount: "20",
        description: "",
        endsAt: "",
        requirements: "Active license",
        specialty: "Registered Nurse (RN)",
        startsAt: "",
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const refetch = () => {
    void jobsQuery.refetch();
    void bookingsQuery.refetch();
    void professionalsQuery.refetch();
  };

  return (
    <Screen
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
            ? jobsQuery.error.message
            : bookingsQuery.error instanceof Error
              ? bookingsQuery.error.message
              : professionalsQuery.error instanceof Error
                ? professionalsQuery.error.message
                : applyMutation.error instanceof Error
                  ? applyMutation.error.message
                  : messageMutation.error instanceof Error
                    ? messageMutation.error.message
                    : createShiftMutation.error instanceof Error
                      ? createShiftMutation.error.message
                      : bookingStatusMutation.error instanceof Error
                        ? bookingStatusMutation.error.message
                        : undefined
        }
      />

      {session?.principal.role === "clinic" ? (
        <>
          <Card>
            <View style={styles.ctaTop}>
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
          <SectionHeader title={t("shifts.applicationsTitle")} />
          {bookingsQuery.data?.items.length ? (
            bookingsQuery.data.items.map((booking) => (
              <Card key={booking.id}>
                <View style={styles.row}>
                  <Avatar label={booking.professionalName} size={46} />
                  <View style={styles.grow}>
                    <Text style={text.h2}>{booking.professionalName}</Text>
                    <Text style={text.body}>{booking.jobTitle}</Text>
                    <Text style={text.body}>
                      {booking.location.city}, {booking.location.region}
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
                    {booking.status}
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
          <SectionHeader title={t("shifts.inviteTitle")} />
          {professionalsQuery.data?.items.map((professional) => (
            <Card key={professional.id}>
              <View style={styles.row}>
                <Avatar label={professional.fullName} size={46} />
                <View style={styles.grow}>
                  <Text style={text.h2}>{professional.fullName}</Text>
                  <Text style={text.body}>{professional.specialty}</Text>
                  <Text style={text.body}>
                    {professional.city}, {professional.region}
                  </Text>
                </View>
                <Badge
                  tone={
                    professional.verificationStatus === "approved"
                      ? "success"
                      : "warning"
                  }
                >
                  {professional.verificationStatus.replace("_", " ")}
                </Badge>
              </View>
              <Button
                loading={messageMutation.isPending}
                onPress={() => messageMutation.mutate(professional.id)}
                tone="secondary"
              >
                {t("shifts.startMessage")}
              </Button>
            </Card>
          ))}
        </>
      ) : null}

      <SectionHeader title={t("dashboard.openShifts")} />
      {jobsQuery.data?.items.length ? (
        jobsQuery.data.items.map((job) => {
          const applied = appliedJobIds.has(job.id);
          return (
            <Card key={job.id}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconShell,
                    { backgroundColor: palette.surfaceMuted },
                  ]}
                >
                  <CalendarClock color={colors.accentDark} size={20} />
                </View>
                <View style={styles.grow}>
                  <Text style={text.h2}>{job.title}</Text>
                  <Text style={text.body}>{job.specialty}</Text>
                </View>
                <Badge tone={job.status === "open" ? "success" : "warning"}>
                  {job.status}
                </Badge>
              </View>
              <View style={styles.metaLine}>
                <MapPin color={colors.muted} size={16} />
                <Text style={text.body}>
                  {job.location.city}, {job.location.region}
                </Text>
              </View>
              <View style={styles.metaLine}>
                <CalendarClock color={colors.muted} size={16} />
                <Text style={text.body}>{formatShiftWindow(job)}</Text>
              </View>
              <Text style={text.strong}>{formatMoney(job)}</Text>
              <Text style={text.body}>{job.summary}</Text>
              {session?.principal.role === "professional" ? (
                <Button
                  disabled={applied || job.status !== "open"}
                  onPress={() => setSelectedJob(job)}
                >
                  {applied
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

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedJob(null)}
        transparent
        visible={Boolean(selectedJob)}
      >
        <View style={styles.modalShade}>
          <View style={[styles.modal, { backgroundColor: palette.surface }]}>
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
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setShowCreateShift(false)}
        transparent
        visible={showCreateShift}
      >
        <View style={styles.modalShade}>
          <View
            style={[styles.modalSheet, { backgroundColor: palette.surface }]}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={text.h2}>{t("shifts.createShift")}</Text>
              <Text style={text.body}>{t("shifts.createShiftBody")}</Text>
              <Field
                label={t("shifts.shiftTitle")}
                onChangeText={(value) =>
                  setShiftDraft((draft) => ({ ...draft, title: value }))
                }
                returnKeyType="next"
                value={shiftDraft.title}
              />
              <Field
                label={t("shifts.specialty")}
                onChangeText={(value) =>
                  setShiftDraft((draft) => ({ ...draft, specialty: value }))
                }
                returnKeyType="next"
                value={shiftDraft.specialty}
              />
              <Field
                autoComplete="off"
                label={t("shifts.startsAt")}
                onChangeText={(value) =>
                  setShiftDraft((draft) => ({ ...draft, startsAt: value }))
                }
                placeholder="2026-06-28T09:00:00+03:00"
                returnKeyType="next"
                value={shiftDraft.startsAt}
              />
              <Field
                autoComplete="off"
                label={t("shifts.endsAt")}
                onChangeText={(value) =>
                  setShiftDraft((draft) => ({ ...draft, endsAt: value }))
                }
                placeholder="2026-06-28T17:00:00+03:00"
                returnKeyType="next"
                value={shiftDraft.endsAt}
              />
              <Field
                keyboardType="decimal-pad"
                label={t("shifts.hourlyRate")}
                onChangeText={(value) =>
                  setShiftDraft((draft) => ({ ...draft, amount: value }))
                }
                returnKeyType="next"
                value={shiftDraft.amount}
              />
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
                  setShiftDraft((draft) => ({ ...draft, description: value }))
                }
                returnKeyType="default"
                value={shiftDraft.description}
              />
              <Field
                label={t("shifts.requirements")}
                onChangeText={(value) =>
                  setShiftDraft((draft) => ({ ...draft, requirements: value }))
                }
                returnKeyType="done"
                value={shiftDraft.requirements}
              />
            </ScrollView>
            <Button
              loading={createShiftMutation.isPending}
              onPress={() => createShiftMutation.mutate()}
            >
              {t("shifts.publishShift")}
            </Button>
            <Pressable
              onPress={() => setShowCreateShift(false)}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>{t("shifts.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
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
  ctaTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  iconShell: {
    alignItems: "center",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  modal: {
    backgroundColor: "#ffffff",
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
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
});

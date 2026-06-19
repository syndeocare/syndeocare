import { useEffect, useState } from "react";
import { backendDb } from "@/integrations/backend/client";
import { useTranslation } from "react-i18next";
import { getAdminNotificationCount } from "@/lib/notifications";
import {
  Activity,
  Calendar,
  MessageSquare,
  Star,
  FileText,
  Bell,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Inbox,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActivityTimelineProps {
  type: "professional" | "clinic";
  userId: string; // auth user id
  profileOrClinicId: string; // profiles.id or clinics.id
}

interface Counts {
  bookingsTotal: number;
  bookingsByStatus: Record<string, number>;
  shiftsPosted?: number;
  shiftsFilled?: number;
  invitationsSent?: number;
  invitationsReceived?: number;
  messagesSent: number;
  ratingsGiven: number;
  ratingsReceived: number;
  docsTotal: number;
  docsByStatus: Record<string, number>;
  notifications: number;
}

const empty: Counts = {
  bookingsTotal: 0,
  bookingsByStatus: {},
  messagesSent: 0,
  ratingsGiven: 0,
  ratingsReceived: 0,
  docsTotal: 0,
  docsByStatus: {},
  notifications: 0,
};

export default function ActivityTimeline({
  type,
  userId,
  profileOrClinicId,
}: ActivityTimelineProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>(empty);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result: Counts = { ...empty };
      const filterCol =
        type === "professional" ? "professional_id" : "clinic_id";

      // Bookings
      const { data: bookings } = await backendDb
        .from("bookings")
        .select("status")
        .eq(filterCol, profileOrClinicId);
      if (bookings) {
        result.bookingsTotal = bookings.length;
        for (const b of bookings) {
          result.bookingsByStatus[b.status] =
            (result.bookingsByStatus[b.status] || 0) + 1;
        }
      }

      // Clinic-only: shifts posted/filled
      if (type === "clinic") {
        const { data: shifts } = await backendDb
          .from("shifts")
          .select("is_filled")
          .eq("clinic_id", profileOrClinicId);
        if (shifts) {
          result.shiftsPosted = shifts.length;
          result.shiftsFilled = shifts.filter((s) => s.is_filled).length;
        }
        const { count: invSent } = await backendDb
          .from("shift_invitations")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", profileOrClinicId);
        result.invitationsSent = invSent || 0;
      } else {
        const { count: invRecv } = await backendDb
          .from("shift_invitations")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", profileOrClinicId);
        result.invitationsReceived = invRecv || 0;
      }

      // Messages sent (sender_id = profile/clinic id)
      const { count: msgs } = await backendDb
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", profileOrClinicId);
      result.messagesSent = msgs || 0;

      // Ratings
      const { count: rGiven } = await backendDb
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", userId);
      result.ratingsGiven = rGiven || 0;
      const { count: rRecv } = await backendDb
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("reviewee_id", userId);
      result.ratingsReceived = rRecv || 0;

      // Documents
      const { data: docs } = await backendDb
        .from("documents")
        .select("status")
        .eq("user_id", userId);
      if (docs) {
        result.docsTotal = docs.length;
        for (const d of docs) {
          result.docsByStatus[d.status] =
            (result.docsByStatus[d.status] || 0) + 1;
        }
      }

      // Notifications
      try {
        const notificationCount = await getAdminNotificationCount(userId);
        result.notifications = notificationCount.count;
      } catch (error) {
        console.error("Falling back to legacy notification count:", error);
        const { count: n } = await backendDb
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        result.notifications = n || 0;
      }

      if (!cancelled) {
        setCounts(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, userId, profileOrClinicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Section = ({
    icon: Icon,
    label,
    total,
    children,
  }: {
    icon: LucideIcon;
    label: string;
    total: number;
    children?: React.ReactNode;
  }) => (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">{label}</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {total}
        </span>
      </div>
      {children && (
        <div className="flex flex-wrap gap-1.5 mt-2">{children}</div>
      )}
    </div>
  );

  const Pill = ({
    icon: Icon,
    label,
    value,
    tone = "muted",
  }: {
    icon?: LucideIcon;
    label: string;
    value: number;
    tone?: "success" | "warning" | "destructive" | "muted";
  }) => {
    const toneCls = {
      success: "bg-success/10 text-success border-success/20",
      warning: "bg-warning/10 text-warning border-warning/20",
      destructive: "bg-destructive/10 text-destructive border-destructive/20",
      muted: "bg-muted text-muted-foreground border-border",
    }[tone];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${toneCls}`}
      >
        {Icon && <Icon className="w-3 h-3" />}
        {label}: <span className="font-semibold tabular-nums">{value}</span>
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Activity className="w-3.5 h-3.5" />
        {t(
          "admin.userDetail.activityHint",
          "Counts of platform activity for this user",
        )}
      </div>

      <Section
        icon={Calendar}
        label={t("admin.userDetail.bookings", "Bookings")}
        total={counts.bookingsTotal}
      >
        {Object.entries(counts.bookingsByStatus).map(([s, n]) => {
          const tone =
            s === "completed" || s === "confirmed"
              ? "success"
              : s === "cancelled" || s === "rejected"
                ? "destructive"
                : s === "requested" || s === "pending"
                  ? "warning"
                  : "muted";
          return (
            <Pill
              key={s}
              label={t(`bookingStatus.${s}`, s)}
              value={n}
              tone={tone}
            />
          );
        })}
      </Section>

      {type === "clinic" ? (
        <>
          <Section
            icon={Briefcase}
            label={t("admin.userDetail.shiftsPosted", "Shifts posted")}
            total={counts.shiftsPosted || 0}
          >
            <Pill
              icon={CheckCircle2}
              label={t("admin.userDetail.filled", "Filled")}
              value={counts.shiftsFilled || 0}
              tone="success"
            />
            <Pill
              icon={Clock}
              label={t("admin.userDetail.open", "Open")}
              value={(counts.shiftsPosted || 0) - (counts.shiftsFilled || 0)}
              tone="warning"
            />
          </Section>
          <Section
            icon={Send}
            label={t("admin.userDetail.invitationsSent", "Invitations sent")}
            total={counts.invitationsSent || 0}
          />
        </>
      ) : (
        <Section
          icon={Inbox}
          label={t(
            "admin.userDetail.invitationsReceived",
            "Invitations received",
          )}
          total={counts.invitationsReceived || 0}
        />
      )}

      <Section
        icon={MessageSquare}
        label={t("admin.userDetail.messagesSent", "Messages sent")}
        total={counts.messagesSent}
      />

      <Section
        icon={Star}
        label={t("admin.userDetail.ratings", "Ratings")}
        total={counts.ratingsGiven + counts.ratingsReceived}
      >
        <Pill
          label={t("admin.userDetail.given", "Given")}
          value={counts.ratingsGiven}
        />
        <Pill
          label={t("admin.userDetail.received", "Received")}
          value={counts.ratingsReceived}
        />
      </Section>

      <Section
        icon={FileText}
        label={t("admin.userDetail.documents")}
        total={counts.docsTotal}
      >
        <Pill
          icon={CheckCircle2}
          label={t("common.verified")}
          value={counts.docsByStatus.verified || 0}
          tone="success"
        />
        <Pill
          icon={Clock}
          label={t("common.pending")}
          value={counts.docsByStatus.pending || 0}
          tone="warning"
        />
        <Pill
          icon={XCircle}
          label={t("common.rejected")}
          value={counts.docsByStatus.rejected || 0}
          tone="destructive"
        />
      </Section>

      <Section
        icon={Bell}
        label={t("admin.userDetail.notifications", "Notifications")}
        total={counts.notifications}
      />
    </div>
  );
}

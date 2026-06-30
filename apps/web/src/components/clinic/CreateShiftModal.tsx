import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import InviteProfessionalsModal from "./InviteProfessionalsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Clock,
  Banknote,
  MapPin,
  Loader2,
  Briefcase,
  AlertCircle,
  X,
  Timer,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  createLegacyJob,
  isGatewayBackendConfigured,
} from "@/lib/platform-backend";
import {
  DEFAULT_CERTIFICATION_OPTIONS,
  DEFAULT_JOB_ROLE_OPTIONS,
  fetchActiveCertificationNames,
  fetchActiveJobRoleNames,
} from "@/lib/admin-catalogs";

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess: () => void;
}

const PROPOSAL_DURATION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "none", label: "No deadline" },
];

const CreateShiftModal = ({
  open,
  onOpenChange,
  clinicId,
  onSuccess,
}: CreateShiftModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [createdShiftId, setCreatedShiftId] = useState<string | null>(null);
  const [roleOptions, setRoleOptions] = useState(DEFAULT_JOB_ROLE_OPTIONS);
  const [certificationOptions, setCertificationOptions] = useState(
    DEFAULT_CERTIFICATION_OPTIONS,
  );

  const [formData, setFormData] = useState({
    title: "",
    role_required: "",
    description: "",
    shift_date: null as Date | null,
    start_time: "08:00",
    end_time: "16:00",
    hourly_rate: "",
    location_address: "",
    is_urgent: false,
    required_certifications: [] as string[],
    max_applicants: "10",
    proposal_duration: "7", // Default: 7 days
  });

  useEffect(() => {
    if (!open) return;

    void Promise.all([
      fetchActiveJobRoleNames(),
      fetchActiveCertificationNames(),
    ]).then(([roles, certifications]) => {
      setRoleOptions(roles);
      setCertificationOptions(certifications);
    });
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.shift_date ||
      !formData.role_required ||
      !formData.hourly_rate
    ) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("shifts.fields.roleRequired"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const shiftDate = format(formData.shift_date, "yyyy-MM-dd");
      const hourlyRate = parseFloat(formData.hourly_rate);
      // Calculate proposal deadline
      let proposalDeadline: string | null = null;
      if (formData.proposal_duration !== "none") {
        const daysToAdd = parseInt(formData.proposal_duration);
        proposalDeadline = addDays(new Date(), daysToAdd).toISOString();
      }

      let insertedShift: { id: string } | null = null;

      if (user && isGatewayBackendConfigured()) {
        try {
          const createdShift = await createLegacyJob(
            {
              user,
              userRole: "clinic",
              clinicId,
              onboardingCompleted: true,
              verificationStatus: "verified",
            },
            {
              title: formData.title || formData.role_required,
              role_required: formData.role_required,
              description: formData.description,
              shift_date: shiftDate,
              start_time: formData.start_time,
              end_time: formData.end_time,
              hourly_rate: hourlyRate,
              location_address: formData.location_address,
              is_urgent: formData.is_urgent,
              required_certifications:
                formData.required_certifications.length > 0
                  ? formData.required_certifications
                  : null,
            },
          );
          insertedShift = { id: createdShift.id };
        } catch (error) {
          console.warn("Falling back to legacy shift creation", error);
        }
      }

      if (!insertedShift) {
        const { data, error } = await backendDb
          .from("shifts")
          .insert({
            clinic_id: clinicId,
            title: formData.title || formData.role_required,
            role_required: formData.role_required,
            description: formData.description,
            shift_date: shiftDate,
            start_time: formData.start_time,
            end_time: formData.end_time,
            hourly_rate: hourlyRate,
            location_address: formData.location_address,
            is_urgent: formData.is_urgent,
            required_certifications:
              formData.required_certifications.length > 0
                ? formData.required_certifications
                : null,
            max_applicants: parseInt(formData.max_applicants) || 10,
            proposal_deadline: proposalDeadline,
          })
          .select("id")
          .single();

        if (error) throw error;
        insertedShift = data;
      }

      toast({
        title: t("shifts.shiftPosted"),
        description: t("shifts.shiftPostedDesc"),
      });

      if (insertedShift) {
        setCreatedShiftId(insertedShift.id);
        setShowInviteModal(true);
      }

      // Reset form
      setFormData({
        title: "",
        role_required: "",
        description: "",
        shift_date: null,
        start_time: "08:00",
        end_time: "16:00",
        hourly_rate: "",
        location_address: "",
        is_urgent: false,
        required_certifications: [],
        max_applicants: "10",
        proposal_duration: "7",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCertification = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      required_certifications: prev.required_certifications.includes(cert)
        ? prev.required_certifications.filter((c) => c !== cert)
        : [...prev.required_certifications, cert],
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t("shifts.postNew")}
            </DialogTitle>
            <DialogDescription>{t("shifts.postNewDesc")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role & Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">
                  {t("shifts.fields.roleRequired")} *
                </Label>
                <Select
                  value={formData.role_required}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role_required: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("shifts.fields.selectRole")} />
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
                <Label htmlFor="title">
                  {t("shifts.fields.title")} ({t("common.optional")})
                </Label>
                <Input
                  id="title"
                  placeholder={t("shifts.fields.titlePlaceholder")}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("shifts.fields.shiftDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-start font-normal",
                        !formData.shift_date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {formData.shift_date
                        ? format(formData.shift_date, "PPP")
                        : t("shifts.fields.pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.shift_date || undefined}
                      onSelect={(date) =>
                        setFormData({ ...formData, shift_date: date || null })
                      }
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">
                  {t("shifts.fields.startTime")} *
                </Label>
                <div className="relative">
                  <Clock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="ps-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">{t("shifts.fields.endTime")} *</Label>
                <div className="relative">
                  <Clock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="ps-9"
                  />
                </div>
              </div>
            </div>

            {/* Hourly Rate & Max Applicants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">
                  {t("shifts.fields.hourlyRate")} *
                </Label>
                <div className="relative">
                  <Banknote className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="45.00"
                    value={formData.hourly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourly_rate: e.target.value })
                    }
                    className="ps-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_applicants">
                  {t("shifts.fields.maxApplicants")}
                </Label>
                <Input
                  id="max_applicants"
                  type="number"
                  min="1"
                  value={formData.max_applicants}
                  onChange={(e) =>
                    setFormData({ ...formData, max_applicants: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Proposal Duration */}
            <div className="space-y-2">
              <Label
                htmlFor="proposal_duration"
                className="flex items-center gap-2"
              >
                <Timer className="w-4 h-4" />
                {t("shifts.fields.proposalDuration", "Application Window")}
              </Label>
              <Select
                value={formData.proposal_duration}
                onValueChange={(value) =>
                  setFormData({ ...formData, proposal_duration: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(
                  "shifts.fields.proposalDurationHint",
                  "How long professionals can apply for this shift",
                )}
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                {t("shifts.fields.shiftLocation")}
              </Label>
              <div className="relative">
                <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder={t("shifts.fields.locationPlaceholder")}
                  value={formData.location_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location_address: e.target.value,
                    })
                  }
                  className="ps-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("shifts.fields.locationHint")}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("shifts.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("shifts.fields.descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Required Certifications */}
            <div className="space-y-3">
              <Label id="certifications-label">
                {t("shifts.fields.requiredCertifications")}
              </Label>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="certifications-label"
              >
                {certificationOptions.map((cert) => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCertification(cert)}
                    aria-pressed={formData.required_certifications.includes(
                      cert,
                    )}
                    className={cn(
                      "px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      formData.required_certifications.includes(cert)
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                    )}
                  >
                    {cert}
                    {formData.required_certifications.includes(cert) && (
                      <X className="w-3 h-3 ms-1 inline" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgent Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">
                    {t("shifts.fields.markUrgent")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("shifts.fields.urgentDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.is_urgent}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_urgent: checked })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-h-[48px]"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1 min-h-[48px] bg-accent hover:bg-accent/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 me-2" />
                    {t("shifts.create")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Professionals Modal */}
      {createdShiftId && (
        <InviteProfessionalsModal
          open={showInviteModal}
          onOpenChange={(open) => {
            setShowInviteModal(open);
            if (!open) setCreatedShiftId(null);
          }}
          shiftId={createdShiftId}
          clinicId={clinicId}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
};

export default CreateShiftModal;

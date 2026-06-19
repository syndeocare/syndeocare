import BrandLogo from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const MobileLandingPage = () => {
  const { t } = useTranslation();

  const highlights = [
    {
      icon: Shield,
      title: t("home.features.verification.title"),
      description: t("home.features.verification.desc"),
    },
    {
      icon: Zap,
      title: t("home.features.matching.title"),
      description: t("home.features.matching.desc"),
    },
    {
      icon: CalendarCheck,
      title: t("home.features.booking.title"),
      description: t("home.features.booking.desc"),
    },
  ];

  const quickSteps = [
    t("home.howItWorks.professionals.step1.title"),
    t("home.howItWorks.professionals.step2.title"),
    t("home.howItWorks.professionals.step3.title"),
  ];

  const stats = [
    t("home.mobileLanding.trustedCard"),
    t("home.mobileLanding.fastCard"),
    t("home.mobileLanding.liveCard"),
  ];

  return (
    <div className="pb-10">
      <section className="relative overflow-hidden gradient-hero px-4 pb-8 pt-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 end-0 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute bottom-0 start-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl"
          >
            <BrandLogo
              className="mb-5"
              iconClassName="h-11 w-11"
              nameClassName="text-xl font-semibold text-white"
              inverted
            />

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {t("home.mobileLanding.badge")}
            </div>

            <h1 className="text-3xl font-bold leading-tight text-white">
              {t("home.hero.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              {t("home.hero.subtitle")}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {stats.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center text-[11px] font-medium leading-4 text-white/85"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link to="/auth?mode=signup&role=professional">
                <Button
                  variant="accent"
                  size="xl"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("auth.imProfessional")}
                  </span>
                  <ArrowRight className="h-5 w-5 rtl-flip" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup&role=clinic">
                <Button
                  variant="outline"
                  size="xl"
                  className="w-full justify-between border-white/25 bg-white/10 text-white hover:bg-white hover:text-primary"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t("auth.imClinic")}
                  </span>
                  <ArrowRight className="h-5 w-5 rtl-flip" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pt-6">
        <div className="mx-auto max-w-md space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              {t("home.mobileLanding.roleTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {t("home.mobileLanding.roleSubtitle")}
            </h2>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t("nav.forProfessionals")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("auth.professionalDesc")}
              </p>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t("nav.forClinics")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("auth.clinicDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pt-8">
        <div className="mx-auto max-w-md">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              {t("home.mobileLanding.highlightsTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {t("home.mobileLanding.highlightsSubtitle")}
            </h2>
          </div>

          <div className="space-y-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pt-8">
        <div className="mx-auto max-w-md rounded-[28px] border border-primary/10 bg-primary/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            {t("home.mobileLanding.stepsTitle")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {t("home.mobileLanding.stepsSubtitle")}
          </h2>

          <div className="mt-5 space-y-3">
            {quickSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-3 rounded-2xl bg-background p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-foreground">{step}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {index === 0
                      ? t("home.howItWorks.professionals.step1.desc")
                      : index === 1
                        ? t("home.howItWorks.professionals.step2.desc")
                        : t("home.howItWorks.professionals.step3.desc")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/auth?mode=signup" className="mt-5 block">
            <Button size="xl" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {t("home.cta.startFree")}
              </span>
              <ArrowRight className="h-5 w-5 rtl-flip" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default MobileLandingPage;

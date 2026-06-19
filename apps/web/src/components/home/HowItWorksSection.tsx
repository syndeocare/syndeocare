import { forwardRef } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  FileCheck,
  Search,
  CalendarCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorksSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();

  const professionalSteps = [
    {
      icon: UserPlus,
      title: t("home.howItWorks.professionals.step1.title"),
      description: t("home.howItWorks.professionals.step1.desc"),
    },
    {
      icon: FileCheck,
      title: t("home.howItWorks.professionals.step2.title"),
      description: t("home.howItWorks.professionals.step2.desc"),
    },
    {
      icon: Search,
      title: t("home.howItWorks.professionals.step3.title"),
      description: t("home.howItWorks.professionals.step3.desc"),
    },
    {
      icon: CalendarCheck,
      title: t("home.howItWorks.professionals.step4.title"),
      description: t("home.howItWorks.professionals.step4.desc"),
    },
  ];

  const clinicSteps = [
    {
      icon: UserPlus,
      title: t("home.howItWorks.clinics.step1.title"),
      description: t("home.howItWorks.clinics.step1.desc"),
    },
    {
      icon: FileCheck,
      title: t("home.howItWorks.clinics.step2.title"),
      description: t("home.howItWorks.clinics.step2.desc"),
    },
    {
      icon: Search,
      title: t("home.howItWorks.clinics.step2.title"),
      description: t("home.howItWorks.clinics.step2.desc"),
    },
    {
      icon: CalendarCheck,
      title: t("home.howItWorks.clinics.step3.title"),
      description: t("home.howItWorks.clinics.step3.desc"),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section
      ref={ref}
      aria-label="How it works"
      className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-background via-secondary/30 to-background relative overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 start-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 end-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16 lg:mb-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              Simple Process
            </span>
          </motion.div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-5 tracking-tight">
            {t("home.howItWorks.title")}
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            {t("home.howItWorks.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* For Professionals */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 mb-10"
            >
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground">
                {t("nav.forProfessionals")}
              </h3>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-7 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20 hidden md:block" />

              <div className="space-y-6">
                {professionalSteps.map((step, index) => (
                  <motion.div
                    key={step.title + index}
                    variants={itemVariants}
                    className="group relative flex gap-5 p-4 rounded-2xl hover:bg-primary/5 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-lg shadow-sm group-hover:border-primary/40 group-hover:shadow-md group-hover:shadow-primary/10 transition-all duration-300">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                          {step.title}
                        </h4>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground/30 self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 rtl-flip" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* For Clinics */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 mb-10"
            >
              <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-accent/25">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground">
                {t("nav.forClinics")}
              </h3>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-7 top-8 bottom-8 w-0.5 bg-gradient-to-b from-accent via-accent/50 to-accent/20 hidden md:block" />

              <div className="space-y-6">
                {clinicSteps.map((step, index) => (
                  <motion.div
                    key={step.title + index}
                    variants={itemVariants}
                    className="group relative flex gap-5 p-4 rounded-2xl hover:bg-accent/5 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-card border-2 border-accent/20 flex items-center justify-center text-accent font-bold text-lg shadow-sm group-hover:border-accent/40 group-hover:shadow-md group-hover:shadow-accent/10 transition-all duration-300">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="w-5 h-5 text-accent" />
                        <h4 className="font-semibold text-foreground text-lg group-hover:text-accent transition-colors">
                          {step.title}
                        </h4>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground/30 self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 rtl-flip" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

HowItWorksSection.displayName = "HowItWorksSection";

export default HowItWorksSection;

import { motion, useInView } from "framer-motion";
import {
  Shield,
  Zap,
  MapPin,
  Calendar,
  Star,
  CreditCard,
  Clock,
  FileCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { forwardRef, useRef, useState } from "react";

const FeaturesSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const features = [
    {
      icon: Shield,
      title: t("home.features.verification.title"),
      description: t("home.features.verification.desc"),
      gradient: "gradient-primary",
      color: "primary",
    },
    {
      icon: Zap,
      title: t("home.features.matching.title"),
      description: t("home.features.matching.desc"),
      gradient: "gradient-accent",
      color: "accent",
    },
    {
      icon: MapPin,
      title: t("professionals.benefits.verified"),
      description: t("professionals.benefits.verifiedDesc"),
      gradient: "gradient-sky",
      color: "sky",
    },
    {
      icon: Calendar,
      title: t("professionals.benefits.flexibility"),
      description: t("professionals.benefits.flexibilityDesc"),
      gradient: "gradient-primary",
      color: "primary",
    },
    {
      icon: Star,
      title: t("dashboard.stats.avgRating"),
      description: t("home.features.booking.desc"),
      gradient: "gradient-accent",
      color: "accent",
    },
    {
      icon: CreditCard,
      title: t("home.features.payments.title"),
      description: t("home.features.payments.desc"),
      gradient: "gradient-sky",
      color: "sky",
    },
    {
      icon: Clock,
      title: t("clinics.benefits.fast"),
      description: t("clinics.benefits.fastDesc"),
      gradient: "gradient-primary",
      color: "primary",
    },
    {
      icon: FileCheck,
      title: t("profile.documents"),
      description: t("home.features.booking.desc"),
      gradient: "gradient-accent",
      color: "accent",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Features"
      className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-background via-secondary/20 to-background relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 start-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
          className="absolute bottom-0 end-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[150px]"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-20"
        >
          {/* Premium badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {t("home.features.title")}
            </span>
          </motion.div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            {t("home.features.subtitle")}
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            {t("home.features.body")}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`group relative p-6 md:p-7 rounded-2xl md:rounded-3xl bg-card border border-border/60 shadow-card hover:shadow-xl transition-all duration-500 touch-manipulation overflow-hidden cursor-default ${
                hoveredIndex === index
                  ? "border-primary/40 -translate-y-3"
                  : "hover:-translate-y-2"
              }`}
            >
              {/* Animated gradient overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl md:rounded-3xl"
              />

              {/* Corner accent */}
              <div
                className={`absolute -top-12 -end-12 w-24 h-24 ${feature.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500`}
              />

              {/* Icon with glow effect */}
              <motion.div
                animate={{
                  scale: hoveredIndex === index ? 1.1 : 1,
                  boxShadow:
                    hoveredIndex === index
                      ? "0 0 30px rgba(var(--primary), 0.3)"
                      : "0 4px 6px rgba(0,0,0,0.1)",
                }}
                transition={{ duration: 0.3 }}
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}
              >
                <feature.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </motion.div>

              {/* Content */}
              <h3 className="relative text-lg md:text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="relative text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                {feature.description}
              </p>

              {/* Learn more link */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: hoveredIndex === index ? 1 : 0,
                  x: hoveredIndex === index ? 0 : -10,
                }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 text-sm font-medium text-primary"
              >
                {t("common.learnMore")}
                <ArrowRight className="w-4 h-4 rtl-flip" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = "FeaturesSection";

export default FeaturesSection;

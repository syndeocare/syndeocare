import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  Star,
  Play,
  Shield,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { forwardRef, useRef } from "react";

const HeroSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const heroTitle = t("home.hero.title");
  const [heroTitleMain, heroTitleAccent = ""] = heroTitle.includes(",")
    ? heroTitle.split(/,(.+)/).map((part) => part.trim())
    : [heroTitle, ""];

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: [0.45, 0, 0.55, 1] as const,
    },
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Hero"
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 gradient-hero overflow-hidden min-h-[85vh] md:min-h-[90vh] flex items-center"
    >
      {/* Animated Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Background decoration - Brand Purple & Teal with Parallax */}
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        {/* Teal accent glow - top right */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 end-0 w-64 md:w-96 h-64 md:h-96 bg-accent/20 rounded-full blur-[100px]"
        />
        {/* Purple primary glow - bottom left */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-10 start-0 w-72 md:w-[30rem] h-72 md:h-[30rem] bg-primary/15 rounded-full blur-[120px]"
        />
        {/* Center blend glow */}
        <div className="absolute top-1/3 start-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-br from-primary/10 via-accent/8 to-transparent rounded-full blur-3xl" />

        {/* Floating orbs with framer-motion */}
        <motion.div
          animate={floatingAnimation}
          className="absolute top-1/4 start-1/4 w-32 h-32 bg-accent/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={floatingAnimation}
          transition={{ delay: 2 }}
          className="absolute bottom-1/3 end-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={floatingAnimation}
          transition={{ delay: 4 }}
          className="absolute top-1/2 end-1/3 w-16 h-16 bg-sky/15 rounded-full blur-xl"
        />
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge with micro-animation */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl text-white text-sm font-medium border border-white/25 shadow-2xl cursor-default"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </motion.div>
              {t("home.hero.trustedBy")}
              <Shield className="w-4 h-4 text-white/60" />
            </motion.span>
          </motion.div>

          {/* Main Heading with staggered letter animation */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-8 tracking-tight"
          >
            {heroTitleMain}
            {heroTitleAccent ? (
              <>
                ,{" "}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent to-sky">
                    {heroTitleAccent}
                  </span>
                  {/* Underline decoration */}
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-accent to-sky rounded-full origin-left"
                  />
                </span>
              </>
            ) : (
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="block mx-auto mt-3 h-1 w-28 bg-gradient-to-r from-accent to-sky rounded-full origin-left"
              />
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-base sm:text-lg md:text-xl text-white/85 mb-12 md:mb-14 max-w-2xl mx-auto leading-relaxed px-4"
          >
            {t("home.hero.subtitle")}
          </motion.p>

          {/* CTA Buttons with hover effects */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 md:mb-20 px-4"
          >
            <Link
              to="/auth?mode=signup&role=professional"
              className="w-full sm:w-auto group"
            >
              <Button
                variant="accent"
                size="xl"
                className="w-full sm:w-auto shadow-2xl hover:shadow-glow-teal transition-all duration-300 min-w-[220px] border border-white/20 group-hover:scale-[1.02]"
              >
                <Users className="w-5 h-5 me-2 group-hover:scale-110 transition-transform" />
                {t("auth.imProfessional")}
                <ArrowRight className="w-5 h-5 ms-2 rtl-flip group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link
              to="/auth?mode=signup&role=clinic"
              className="w-full sm:w-auto group"
            >
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto border-2 border-white/40 text-white hover:bg-white hover:text-primary bg-white/10 backdrop-blur-md transition-all duration-300 min-w-[220px] group-hover:scale-[1.02]"
              >
                <Building2 className="w-5 h-5 me-2 group-hover:scale-110 transition-transform" />
                {t("auth.imClinic")}
              </Button>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-16 hidden md:flex flex-col items-center"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2"
            >
              <motion.div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";

export default HeroSection;

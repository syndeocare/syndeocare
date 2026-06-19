import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRef, forwardRef } from "react";

const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const benefits = [
    { icon: CheckCircle2, text: "Free to get started" },
    { icon: Shield, text: "Verified professionals" },
    { icon: Users, text: "24/7 Support" },
  ];

  return (
    <section
      ref={sectionRef}
      aria-label="Call to action"
      className="py-12 md:py-20 lg:py-24 bg-background"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] gradient-hero p-8 md:p-14 lg:p-20"
        >
          {/* Animated background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-32 -end-32 w-72 md:w-96 h-72 md:h-96 bg-accent/25 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, -5, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 3,
              }}
              className="absolute -bottom-32 -start-32 w-80 md:w-[28rem] h-80 md:h-[28rem] bg-sky/20 rounded-full blur-[120px]"
            />
            <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />

            {/* Floating particles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-20, 20, -20],
                  x: [-10, 10, -10],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 5 + i * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
                className="absolute w-2 h-2 bg-white/30 rounded-full blur-sm"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${10 + i * 20}%`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-xl text-accent border border-white/25 mb-10 shadow-lg"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              <span className="text-sm font-semibold">
                {t("common.getStarted")}
              </span>
            </motion.div>

            {/* Heading with animated gradient */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-7 tracking-tight leading-tight"
            >
              {t("home.cta.title")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-base md:text-lg lg:text-xl text-white/80 mb-8 px-4 leading-relaxed"
            >
              {t("home.cta.subtitle")}
            </motion.p>

            {/* Benefits list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-10"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-2 text-white/90 text-sm md:text-base"
                >
                  <benefit.icon className="w-5 h-5 text-accent" />
                  <span>{benefit.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/auth?mode=signup" className="w-full sm:w-auto group">
                <Button
                  size="xl"
                  variant="accent"
                  className="w-full sm:w-auto shadow-2xl hover:shadow-glow-teal transition-all duration-300 min-w-[220px] border border-white/20 group-hover:scale-[1.02]"
                >
                  {t("home.cta.startFree")}
                  <ArrowRight className="w-5 h-5 ms-2 rtl-flip group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/about" className="w-full sm:w-auto group">
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-white/40 text-white hover:bg-white hover:text-primary bg-white/10 backdrop-blur-md transition-all duration-300 min-w-[220px] group-hover:scale-[1.02]"
                >
                  {t("nav.about")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;

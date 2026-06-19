import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Heart,
  Users,
  Building2,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();

  const values = [
    {
      icon: Heart,
      title: t("about.values.quality"),
      description: t("about.values.qualityDesc"),
    },
    {
      icon: Shield,
      title: t("about.values.trust"),
      description: t("about.values.trustDesc"),
    },
    {
      icon: Sparkles,
      title: t("about.values.flexibility"),
      description: t("about.values.flexibilityDesc"),
    },
    {
      icon: Target,
      title: t("about.values.trust"),
      description: t("about.values.trustDesc"),
    },
  ];

  // Stats removed pre-launch — bring back once we have real numbers.

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 gradient-hero" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6"
              >
                <Heart className="w-8 h-8 text-primary-foreground" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
              >
                {t("about.title")}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-white/85"
              >
                {t("about.missionText")}
              </motion.p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold text-foreground mb-6">
                    {t("about.mission")}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {t("about.missionText")}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {t("about.storyText")}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <Users className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold text-foreground mb-1">
                      {t("nav.forProfessionals")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("professionals.benefits.flexibilityDesc")}
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-accent/5 border border-accent/10">
                    <Building2 className="w-8 h-8 text-accent mb-3" />
                    <h4 className="font-semibold text-foreground mb-1">
                      {t("nav.forClinics")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("clinics.benefits.fastDesc")}
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-success/5 border border-success/10 col-span-2">
                    <Heart className="w-8 h-8 text-success mb-3" />
                    <h4 className="font-semibold text-foreground mb-1">
                      {t("about.values.quality")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("about.values.qualityDesc")}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t("about.values.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("home.features.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title + index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border text-center"
                >
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats section removed pre-launch */}
        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t("home.cta.title")}
              </h2>
              <p className="text-muted-foreground mb-8">
                {t("home.cta.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/for-professionals">
                    {t("auth.imProfessional")}
                    <ArrowRight className="w-5 h-5 ms-2 rtl-flip" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/for-clinics">
                    {t("auth.imClinic")}
                    <ArrowRight className="w-5 h-5 ms-2 rtl-flip" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;

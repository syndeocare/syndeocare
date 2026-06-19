import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-foreground">
                SyndeoCare
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-16">
        <div className="text-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <span className="text-[150px] font-bold text-primary/10 leading-none">
                404
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center">
                  <Search className="w-12 h-12 text-primary-foreground" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {t("location.noResults")}
            </h1>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("dashboard.noShiftsDesc")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/">
                  <Home className="w-5 h-5 me-2" />
                  {t("nav.home")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
              >
                <button>
                  <ArrowLeft className="w-5 h-5 me-2 rtl-flip" />
                  {t("common.back")}
                </button>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-semibold text-foreground mb-4">
              {t("common.seeMore")}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link
                to="/"
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
              >
                {t("nav.home")}
              </Link>
              <Link
                to="/for-professionals"
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
              >
                {t("nav.forProfessionals")}
              </Link>
              <Link
                to="/for-clinics"
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
              >
                {t("nav.forClinics")}
              </Link>
              <Link
                to="/auth"
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
              >
                {t("common.logIn")}
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default NotFound;

import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  Heart,
  Shield,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SITE_CONFIG } from "@/config/constants";
import { motion } from "framer-motion";
import { forwardRef } from "react";
import BrandLogo from "@/components/brand/BrandLogo";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const linkHover =
    "text-white/70 hover:text-accent transition-all duration-200 hover:translate-x-1 inline-flex items-center gap-1 group";

  return (
    <footer className="gradient-hero text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 end-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-14 md:py-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
          {/* Brand */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.span whileHover={{ scale: 1.05 }}>
                <BrandLogo
                  iconClassName="h-12 w-12"
                  nameClassName="text-xl font-semibold"
                  inverted
                />
              </motion.span>
            </Link>
            <p className="text-white/70 leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
            {/* Trust badge */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Shield className="w-4 h-4 text-accent" />
                <span>{t("footer.verifiedBadge")}</span>
              </div>
            </div>
          </div>

          {/* For Professionals */}
          <div>
            <h4 className="font-semibold text-white text-lg mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              {t("footer.forProfessionals")}
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/for-professionals" className={linkHover}>
                  {t("footer.findShifts")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  to="/auth?mode=signup&role=professional"
                  className={linkHover}
                >
                  {t("common.signUp")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/help" className={linkHover}>
                  {t("footer.help")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* For Clinics */}
          <div>
            <h4 className="font-semibold text-white text-lg mb-5">
              {t("footer.forClinics")}
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/for-clinics" className={linkHover}>
                  {t("footer.postShifts")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/auth?mode=signup&role=clinic" className={linkHover}>
                  {t("common.signUp")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/about" className={linkHover}>
                  {t("nav.about")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white text-lg mb-5">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href={`mailto:${SITE_CONFIG.supportEmail}`}
                  className="flex items-center gap-3 text-white/70 hover:text-accent transition-colors group"
                >
                  <Mail className="w-5 h-5 flex-shrink-0 text-accent group-hover:scale-110 transition-transform" />
                  {SITE_CONFIG.supportEmail}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SITE_CONFIG.supportPhone}`}
                  className="flex items-center gap-3 text-white/70 hover:text-accent transition-colors group"
                >
                  <Phone className="w-5 h-5 flex-shrink-0 text-accent group-hover:scale-110 transition-transform" />
                  {SITE_CONFIG.supportPhone}
                </a>
              </li>
              <li className="flex items-center gap-3 text-white/70">
                <MapPin className="w-5 h-5 flex-shrink-0 text-accent" />
                {SITE_CONFIG.location}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <p className="text-sm text-white/50 flex items-center gap-1">
            {t("footer.copyright", { year: new Date().getFullYear() })}
            <Heart className="w-3 h-3 text-destructive mx-1 animate-pulse" />
          </p>
          <div className="flex items-center gap-6 md:gap-8">
            <Link
              to="/privacy"
              className="text-sm text-white/50 hover:text-accent transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              to="/terms"
              className="text-sm text-white/50 hover:text-accent transition-colors"
            >
              {t("footer.terms")}
            </Link>
            <Link
              to="/help"
              className="text-sm text-white/50 hover:text-accent transition-colors"
            >
              {t("footer.help")}
            </Link>
            <button
              onClick={scrollToTop}
              className="text-sm text-white/50 hover:text-accent transition-colors flex items-center gap-1"
              aria-label={t("footer.backToTop")}
            >
              {t("footer.backToTop")}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

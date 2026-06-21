import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Search,
  User,
  MessageCircle,
  Users,
  Plus,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Pages that should show the mobile navigation
const SHOW_NAV_ROUTES = [
  "/dashboard/professional",
  "/dashboard/clinic",
  "/admin",
  "/shifts",
  "/search/professionals",
  "/messages",
  "/profile/professional",
  "/profile/clinic",
  "/settings",
];

export const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, userRole, isOnboardingComplete } = useAuth();

  // Only show for authenticated users on specific routes
  const shouldShow =
    user &&
    isOnboardingComplete &&
    SHOW_NAV_ROUTES.some(
      (route) =>
        location.pathname === route ||
        location.pathname.startsWith(route + "/"),
    );

  if (!shouldShow) return null;

  const getDashboardPath = () => {
    if (userRole === "admin" || userRole === "super_admin") return "/admin";
    if (userRole === "clinic") return "/dashboard/clinic";
    return "/dashboard/professional";
  };

  const getProfilePath = () => {
    if (userRole === "clinic") return "/profile/clinic";
    if (userRole === "admin" || userRole === "super_admin") return "/admin";
    return "/profile/professional";
  };

  const getSearchPath = () => {
    if (userRole === "clinic") return "/search/professionals";
    return "/shifts";
  };

  const showCenterAction = userRole === "clinic";

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Background with glass effect */}
      <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-lg safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2 relative">
          {/* Home */}
          <NavItem
            path={getDashboardPath()}
            icon={LayoutDashboard}
            label={t("mobile.home")}
            isActive={isActive(getDashboardPath())}
          />

          {/* Search/Shifts */}
          <NavItem
            path={getSearchPath()}
            icon={userRole === "clinic" ? Users : Search}
            label={
              userRole === "clinic" ? t("mobile.search") : t("mobile.shifts")
            }
            isActive={isActive(getSearchPath())}
          />

          {/* Center FAB spacer */}
          {showCenterAction && <div className="w-16" />}

          {/* Messages */}
          <NavItem
            path="/messages"
            icon={MessageCircle}
            label={t("mobile.messages")}
            isActive={isActive("/messages")}
          />

          {/* Profile */}
          <NavItem
            path={getProfilePath()}
            icon={userRole === "clinic" ? Building2 : User}
            label={t("mobile.profile")}
            isActive={isActive(getProfilePath())}
          />

          {/* Floating Action Button */}
          {showCenterAction && (
            <Link
              to="/dashboard/clinic?action=create-shift"
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -top-5",
                "w-14 h-14 rounded-2xl",
                "flex items-center justify-center",
                "shadow-lg active:scale-95 transition-transform",
                "ring-4 ring-background",
                userRole === "clinic"
                  ? "bg-gradient-to-br from-accent to-accent/80 shadow-accent/25"
                  : "bg-gradient-to-br from-primary to-primary/80 shadow-primary/25",
              )}
              aria-label={t("mobile.postShift")}
            >
              <Plus className="h-6 w-6 text-white" />
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

interface NavItemProps {
  path: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  badge?: number;
}

const NavItem = ({
  path,
  icon: Icon,
  label,
  isActive,
  badge,
}: NavItemProps) => {
  return (
    <Link
      to={path}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5",
        "min-w-[56px] min-h-[48px] px-3 py-2 rounded-xl",
        "transition-all duration-200 active:scale-95",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <div className="relative">
        <Icon
          className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")}
        />
        {badge !== undefined && badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -end-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full"
          >
            {badge > 99 ? "99+" : badge}
          </motion.span>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium leading-tight",
          isActive && "font-semibold",
        )}
      >
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );
};

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User,
  Settings,
  LogOut,
  Building2,
  LayoutDashboard,
  Shield,
  ChevronDown,
  Globe,
  Moon,
  Sun,
} from "lucide-react";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { useTheme } from "@/contexts/ThemeContext";

export const UserProfileMenu = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { signOut, user, userRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    displayName: profileName,
    avatarUrl: profileAvatar,
    verificationStatus,
  } = useProfile();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const displayName = profileName || user.email?.split("@")[0] || "User";
  const avatarUrl = profileAvatar;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getProfileLink = () => {
    if (userRole === "clinic") return "/profile/clinic";
    if (userRole === "admin" || userRole === "super_admin") return "/admin";
    return "/profile/professional";
  };

  const getDashboardLink = () => {
    if (userRole === "clinic") return "/dashboard/clinic";
    if (userRole === "admin" || userRole === "super_admin") return "/admin";
    return "/dashboard/professional";
  };

  const ProfileIcon =
    userRole === "clinic"
      ? Building2
      : userRole === "admin" || userRole === "super_admin"
        ? Shield
        : User;

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/auth", { replace: true });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1.5 px-1.5 sm:px-2 h-10 rounded-xl hover:bg-secondary/80"
        >
          <div className="relative">
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {verificationStatus && (
              <div className="absolute -bottom-0.5 -end-0.5">
                <VerificationBadge status={verificationStatus} size="sm" />
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 sm:w-72 p-2"
        sideOffset={8}
      >
        {/* User Info Header */}
        <DropdownMenuLabel className="font-normal p-3 bg-secondary/50 rounded-lg mb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                {verificationStatus && (
                  <VerificationBadge status={verificationStatus} size="sm" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              <p className="text-xs text-primary capitalize mt-0.5">
                {userRole === "super_admin" ? "Super Admin" : userRole}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Navigation Items */}
        <DropdownMenuItem asChild className="h-11 rounded-lg cursor-pointer">
          <Link to={getDashboardLink()} className="flex items-center gap-3">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span>{t("nav.dashboard")}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="h-11 rounded-lg cursor-pointer">
          <Link to={getProfileLink()} className="flex items-center gap-3">
            <ProfileIcon className="h-4 w-4 text-muted-foreground" />
            <span>{t("nav.profile")}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="h-11 rounded-lg cursor-pointer">
          <Link to="/settings" className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>{t("nav.settings")}</span>
          </Link>
        </DropdownMenuItem>

        {(userRole === "admin" || userRole === "super_admin") && (
          <DropdownMenuItem asChild className="h-11 rounded-lg cursor-pointer">
            <Link to="/admin" className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>{t("nav.adminPanel")}</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-2" />

        {/* Quick Actions */}
        <div className="flex items-center gap-2 px-2 py-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 gap-2 text-xs"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
            {theme === "dark" ? t("common.light") : t("common.dark")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 gap-2 text-xs"
            onClick={toggleLanguage}
          >
            <Globe className="h-3.5 w-3.5" />
            {i18n.language === "ar" ? "English" : "العربية"}
          </Button>
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* Logout */}
        <DropdownMenuItem
          className="h-11 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 me-3" />
          <span>{t("common.logOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import BrandLogo from "@/components/brand/BrandLogo";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";

const DashboardHeader = () => {
  const { t } = useTranslation();
  const unreadMessagesCount = useUnreadMessagesCount();

  return (
    <header className="bg-card/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 safe-area-inset">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo - smaller on mobile */}
          <Link
            to="/"
            className="flex items-center gap-2 min-h-[44px] shrink-0"
          >
            <BrandLogo
              iconClassName="h-8 w-8 sm:h-10 sm:w-10"
              nameClassName="text-base sm:text-lg"
            />
          </Link>

          {/* Right side actions - compact on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Messages - icon only */}
            <Link to="/messages">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 sm:h-10 sm:w-10 rounded-xl"
                aria-label={t("chat.messages")}
              >
                <MessageCircle className="h-5 w-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Notifications */}
            <NotificationCenter />

            {/* User Profile Menu - handles settings, profile, logout */}
            <UserProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

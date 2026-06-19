import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(
      "OAuth sign-in is not available on the current owned backend authentication flow.",
    );
    toast({
      variant: "destructive",
      title: t("auth.errors.loginFailed"),
      description:
        "OAuth sign-in is not available on the current owned backend authentication flow.",
    });

    const timeout = window.setTimeout(() => {
      navigate("/auth", { replace: true });
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [navigate, t, toast]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-hero gap-4">
        <div className="text-white text-lg">{error}</div>
        <div className="text-white/70 text-sm">
          {t("common.redirecting")}...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-hero gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-white" />
      <div className="text-white/80 text-lg">{t("auth.verifying")}...</div>
    </div>
  );
};

export default AuthCallback;

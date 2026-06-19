import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { confirmEmailVerification } from "@/lib/auth-backend";

const VerifyCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const token = searchParams.get("token");

        if (!token) {
          throw new Error("Missing verification token.");
        }

        await confirmEmailVerification(token);
        setStatus("success");

        setTimeout(() => {
          navigate("/auth", {
            replace: true,
            state: { emailVerified: true },
          });
        }, 2000);
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    void handleVerification();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl text-foreground">SyndeoCare</span>
        </Link>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
          {status === "loading" && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("auth.verification.verifying")}
              </h1>
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-8 h-8 text-success" />
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("auth.verification.verified")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.verification.verifiedDesc")}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("auth.verification.failed")}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t("auth.verification.failedDesc")}
              </p>
              <div className="space-y-3">
                <Link to="/auth?mode=signup">
                  <Button variant="hero" className="w-full">
                    {t("auth.verification.tryAgain")}
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="w-full">
                    {t("common.back")} {t("nav.home").toLowerCase()}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyCallback;

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

interface LegalPageRow {
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  updated_at: string;
}

const LegalPage = ({ forcedSlug }: { forcedSlug?: string }) => {
  const params = useParams<{ slug?: string }>();
  const slug = forcedSlug || params.slug || "privacy";
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [page, setPage] = useState<LegalPageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await backendDb
        .from("legal_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setPage(data as LegalPageRow);
      }
      setLoading(false);
    };
    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const title = isRTL ? page?.title_ar : page?.title_en;
  const content = isRTL ? page?.content_ar : page?.content_en;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/">
            <ArrowLeft
              className={`w-4 h-4 ${isRTL ? "ms-2 rotate-180" : "me-2"}`}
            />
            {t("common.back")}
          </Link>
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notFound || !page ? (
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("legal.notFoundTitle")}
            </h1>
            <p className="text-muted-foreground">{t("legal.notFoundDesc")}</p>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-card"
          >
            <header className="mb-8 pb-6 border-b border-border">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {t("legal.lastUpdated")}:{" "}
                {new Date(page.updated_at).toLocaleDateString(
                  isRTL ? "ar" : "en",
                )}
              </p>
            </header>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown>{content || ""}</ReactMarkdown>
            </div>
          </motion.article>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;

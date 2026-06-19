import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Scale, FileText, LifeBuoy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface LegalPage {
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  updated_at: string;
}

const SLUGS = [
  { slug: "privacy", icon: Scale },
  { slug: "terms", icon: FileText },
  { slug: "help", icon: LifeBuoy },
];

const LegalPagesManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user } = useAuth();
  const { toast } = useToast();

  const [pages, setPages] = useState<Record<string, LegalPage>>({});
  const [activeSlug, setActiveSlug] = useState("privacy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    const { data } = await backendDb.from("legal_pages").select("*");
    if (data) {
      const byKey: Record<string, LegalPage> = {};
      (data as LegalPage[]).forEach((p) => (byKey[p.slug] = p));
      setPages(byKey);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const updateField = (slug: string, key: keyof LegalPage, value: string) => {
    setPages((prev) => ({ ...prev, [slug]: { ...prev[slug], [key]: value } }));
  };

  const handleSave = async (slug: string) => {
    const page = pages[slug];
    if (!page) return;
    setSaving(true);
    const { error } = await backendDb
      .from("legal_pages")
      .update({
        title_en: page.title_en,
        title_ar: page.title_ar,
        content_en: page.content_en,
        content_ar: page.content_ar,
        updated_by: user?.id,
      })
      .eq("slug", slug);
    setSaving(false);
    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } else {
      toast({ title: t("legal.saved"), description: t("legal.savedDesc") });
      fetchPages();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card dir={isRTL ? "rtl" : "ltr"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="w-5 h-5 text-primary" />
          {t("legal.adminTitle")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("legal.adminSubtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeSlug}
          onValueChange={setActiveSlug}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-3 w-full">
            {SLUGS.map(({ slug, icon: Icon }) => (
              <TabsTrigger key={slug} value={slug} className="gap-2">
                <Icon className="w-4 h-4" />
                {t(`legal.slugs.${slug}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {SLUGS.map(({ slug }) => {
            const page = pages[slug];
            if (!page) return null;
            return (
              <TabsContent key={slug} value={slug} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("legal.titleEn")}</Label>
                    <Input
                      value={page.title_en}
                      onChange={(e) =>
                        updateField(slug, "title_en", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("legal.titleAr")}</Label>
                    <Input
                      dir="rtl"
                      value={page.title_ar}
                      onChange={(e) =>
                        updateField(slug, "title_ar", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("legal.contentEn")} (Markdown)</Label>
                    <Textarea
                      value={page.content_en}
                      onChange={(e) =>
                        updateField(slug, "content_en", e.target.value)
                      }
                      rows={18}
                      className="font-mono text-sm"
                    />
                    <div className="border border-border rounded-lg p-4 bg-muted/30 prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto">
                      <ReactMarkdown>{page.content_en}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("legal.contentAr")} (Markdown)</Label>
                    <Textarea
                      dir="rtl"
                      value={page.content_ar}
                      onChange={(e) =>
                        updateField(slug, "content_ar", e.target.value)
                      }
                      rows={18}
                      className="font-mono text-sm"
                    />
                    <div
                      dir="rtl"
                      className="border border-border rounded-lg p-4 bg-muted/30 prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto"
                    >
                      <ReactMarkdown>{page.content_ar}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSave(slug)}
                    disabled={saving}
                    className="min-h-[44px]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 me-2" />
                        {t("common.save")}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LegalPagesManagement;

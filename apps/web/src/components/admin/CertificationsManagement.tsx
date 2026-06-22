import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Award, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  deleteAdminCatalogItem,
  listAdminCatalogItems,
  saveAdminCatalogItem,
} from "@/lib/admin-catalogs";

interface Certification {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  name_ar?: string | null;
}

const CertificationsManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();

  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    abbreviation: "",
    description: "",
    is_active: true,
  });

  const fetchCertifications = useCallback(async () => {
    try {
      setCertifications(await listAdminCatalogItems("certification"));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void fetchCertifications();
  }, [fetchCertifications]);

  const handleOpenDialog = (cert?: Certification) => {
    if (cert) {
      setEditingCert(cert);
      setFormData({
        name: cert.name,
        name_ar: cert.name_ar || "",
        abbreviation: cert.abbreviation || "",
        description: cert.description || "",
        is_active: cert.is_active,
      });
    } else {
      setEditingCert(null);
      setFormData({
        name: "",
        name_ar: "",
        abbreviation: "",
        description: "",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        kind: "certification" as const,
        name: formData.name,
        nameAr: formData.name_ar || null,
        abbreviation: formData.abbreviation || null,
        description: formData.description || null,
        isActive: formData.is_active,
      };
      if (editingCert) {
        await saveAdminCatalogItem({ ...payload, id: editingCert.id });
        toast({ title: t("admin.config.certificationUpdated") });
      } else {
        await saveAdminCatalogItem(payload);
        toast({ title: t("admin.config.certificationCreated") });
      }

      setIsDialogOpen(false);
      await fetchCertifications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cert: Certification) => {
    if (!confirm(t("admin.config.confirmDeleteCert"))) return;

    try {
      await deleteAdminCatalogItem(cert.id);
      toast({ title: t("admin.config.certificationDeleted") });
      await fetchCertifications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const handleToggleActive = async (cert: Certification) => {
    try {
      await saveAdminCatalogItem({
        id: cert.id,
        kind: "certification",
        name: cert.name,
        nameAr: cert.name_ar ?? null,
        abbreviation: cert.abbreviation,
        description: cert.description,
        isActive: !cert.is_active,
      });
      await fetchCertifications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const filteredCerts = certifications.filter(
    (cert) =>
      cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          {t("admin.config.certifications")}
          <Badge variant="secondary" className="ms-2">
            {certifications.length}
          </Badge>
        </CardTitle>
        <Button
          onClick={() => handleOpenDialog()}
          size="sm"
          className="min-h-[44px]"
        >
          <Plus className="w-4 h-4 me-2" />
          <span className="hidden sm:inline">{t("admin.config.addCert")}</span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
          />
          <Input
            placeholder={t("admin.config.searchCerts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? "pr-9" : "pl-9"} min-h-[44px]`}
          />
        </div>

        {/* Certifications List - Grid for better display */}
        {filteredCerts.length === 0 ? (
          <InlineEmptyState
            icon={Award}
            message={
              searchQuery
                ? t("admin.config.noCertsFound")
                : t("admin.config.noCertsYet")
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCerts.map((cert) => (
              <div
                key={cert.id}
                className={`p-4 rounded-lg border transition-colors min-h-[80px] ${
                  cert.is_active
                    ? "bg-secondary/50 border-border hover:bg-secondary"
                    : "bg-muted/30 border-muted opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {cert.abbreviation && (
                        <Badge variant="default" className="text-xs font-bold">
                          {cert.abbreviation}
                        </Badge>
                      )}
                      <p className="font-medium text-foreground text-sm truncate">
                        {isRTL && cert.name_ar ? cert.name_ar : cert.name}
                        {isRTL && cert.name_ar && (
                          <span className="ms-1 text-xs text-muted-foreground">
                            ({cert.name})
                          </span>
                        )}
                      </p>
                    </div>
                    {cert.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {cert.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                  <Switch
                    checked={cert.is_active}
                    onCheckedChange={() => handleToggleActive(cert)}
                    aria-label={t("admin.config.toggleActive")}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(cert)}
                      className="h-8 w-8"
                      aria-label={t("common.edit")}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cert)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingCert
                ? t("admin.config.editCert")
                : t("admin.config.addCert")}
            </DialogTitle>
            <DialogDescription>
              {editingCert
                ? t("admin.config.editCertDesc")
                : t("admin.config.addCertDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">{t("admin.config.certName")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("admin.config.certNamePlaceholder")}
                  required
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name_ar">{t("admin.config.certNameAr")}</Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ar: e.target.value })
                  }
                  placeholder={t("admin.config.certNameArPlaceholder")}
                  dir="rtl"
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abbreviation">
                  {t("admin.config.certAbbreviation")}
                </Label>
                <Input
                  id="abbreviation"
                  value={formData.abbreviation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      abbreviation: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="BLS, ACLS..."
                  maxLength={10}
                  className="min-h-[44px] uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active" className="flex items-center gap-2">
                  {t("admin.config.activeCert")}
                </Label>
                <div className="flex items-center h-[44px]">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("admin.config.certDescription")}
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("admin.config.certDescriptionPlaceholder")}
                className="min-h-[44px]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="min-h-[44px]"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingCert ? (
                  t("common.save")
                ) : (
                  t("common.create")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CertificationsManagement;

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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Stethoscope,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  deleteAdminCatalogItem,
  listAdminCatalogItems,
  saveAdminCatalogItem,
} from "@/lib/admin-catalogs";

interface Specialty {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const SpecialtiesManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();

  const [items, setItems] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    is_active: true,
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await listAdminCatalogItems("specialty"));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
    setIsLoading(false);
  }, [t, toast]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const openDialog = (s?: Specialty) => {
    if (s) {
      setEditing(s);
      setFormData({
        name: s.name,
        name_ar: s.name_ar || "",
        description: s.description || "",
        is_active: s.is_active,
      });
    } else {
      setEditing(null);
      setFormData({ name: "", name_ar: "", description: "", is_active: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        kind: "specialty" as const,
        name: formData.name.trim(),
        nameAr: formData.name_ar.trim() || null,
        description: formData.description.trim() || null,
        isActive: formData.is_active,
      };
      if (editing) {
        await saveAdminCatalogItem({
          ...payload,
          id: editing.id,
          displayOrder: editing.display_order,
        });
        toast({ title: t("admin.config.specialtyUpdated") });
      } else {
        await saveAdminCatalogItem({ ...payload, displayOrder: items.length });
        toast({ title: t("admin.config.specialtyCreated") });
      }
      setIsDialogOpen(false);
      await fetchItems();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (s: Specialty) => {
    if (!confirm(t("admin.config.confirmDeleteSpecialty"))) return;
    try {
      await deleteAdminCatalogItem(s.id);
      toast({ title: t("admin.config.specialtyDeleted") });
      await fetchItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const handleToggleActive = async (s: Specialty) => {
    try {
      await saveAdminCatalogItem({
        id: s.id,
        kind: "specialty",
        name: s.name,
        nameAr: s.name_ar,
        description: s.description,
        isActive: !s.is_active,
        displayOrder: s.display_order,
      });
      await fetchItems();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err.message,
      });
    }
  };

  const q = searchQuery.toLowerCase();
  const filtered = items.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.name_ar || "").includes(searchQuery),
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
          <Stethoscope className="w-5 h-5 text-primary" />
          {t("admin.config.specialties")}
          <Badge variant="secondary" className="ms-2">
            {items.length}
          </Badge>
        </CardTitle>
        <Button onClick={() => openDialog()} size="sm" className="min-h-[44px]">
          <Plus className="w-4 h-4 me-2" />
          <span className="hidden sm:inline">
            {t("admin.config.addSpecialty")}
          </span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search
            className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
          />
          <Input
            placeholder={t("admin.config.searchSpecialties")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? "pr-9" : "pl-9"} min-h-[44px]`}
          />
        </div>

        {filtered.length === 0 ? (
          <InlineEmptyState
            icon={Stethoscope}
            message={
              searchQuery
                ? t("admin.config.noSpecialtiesFound")
                : t("admin.config.noSpecialtiesYet")
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors min-h-[60px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">
                      {s.name}
                    </p>
                    {s.name_ar && (
                      <span className="text-sm text-muted-foreground">
                        ({s.name_ar})
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {s.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={() => handleToggleActive(s)}
                    aria-label={t("admin.config.toggleActive")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(s)}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s)}
                    className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("admin.config.editSpecialty")
                : t("admin.config.addSpecialty")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? t("admin.config.editSpecialtyDesc")
                : t("admin.config.addSpecialtyDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sp-name">
                {t("admin.config.specialtyName")} *
              </Label>
              <Input
                id="sp-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("admin.config.specialtyNamePlaceholder")}
                required
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-name-ar">
                {t("admin.config.specialtyNameAr")}
              </Label>
              <Input
                id="sp-name-ar"
                value={formData.name_ar}
                onChange={(e) =>
                  setFormData({ ...formData, name_ar: e.target.value })
                }
                placeholder={t("admin.config.specialtyNameArPlaceholder")}
                dir="rtl"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-desc">
                {t("admin.config.specialtyDescription")}
              </Label>
              <Input
                id="sp-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("admin.config.specialtyDescriptionPlaceholder")}
                className="min-h-[44px]"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <Label htmlFor="sp-active" className="cursor-pointer">
                {t("admin.config.activeSpecialty")}
              </Label>
              <Switch
                id="sp-active"
                checked={formData.is_active}
                onCheckedChange={(c) =>
                  setFormData({ ...formData, is_active: c })
                }
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
                ) : editing ? (
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

export default SpecialtiesManagement;

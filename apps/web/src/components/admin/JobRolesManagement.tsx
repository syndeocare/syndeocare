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
  Briefcase,
  GripVertical,
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

interface JobRole {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const JobRolesManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();

  const [roles, setRoles] = useState<JobRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<JobRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    is_active: true,
  });

  const fetchRoles = useCallback(async () => {
    try {
      setRoles(await listAdminCatalogItems("job_role"));
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
    void fetchRoles();
  }, [fetchRoles]);

  const handleOpenDialog = (role?: JobRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        name_ar: role.name_ar || "",
        description: role.description || "",
        is_active: role.is_active,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: "",
        name_ar: "",
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
      if (editingRole) {
        await saveAdminCatalogItem({
          id: editingRole.id,
          kind: "job_role",
          name: formData.name,
          nameAr: formData.name_ar || null,
          description: formData.description || null,
          isActive: formData.is_active,
          displayOrder: editingRole.display_order,
        });
        toast({ title: t("admin.config.roleUpdated") });
      } else {
        await saveAdminCatalogItem({
          kind: "job_role",
          name: formData.name,
          nameAr: formData.name_ar || null,
          description: formData.description || null,
          isActive: formData.is_active,
          displayOrder: roles.length,
        });
        toast({ title: t("admin.config.roleCreated") });
      }

      setIsDialogOpen(false);
      await fetchRoles();
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

  const handleDelete = async (role: JobRole) => {
    if (!confirm(t("admin.config.confirmDeleteRole"))) return;

    try {
      await deleteAdminCatalogItem(role.id);
      toast({ title: t("admin.config.roleDeleted") });
      await fetchRoles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const handleToggleActive = async (role: JobRole) => {
    try {
      await saveAdminCatalogItem({
        id: role.id,
        kind: "job_role",
        name: role.name,
        nameAr: role.name_ar,
        description: role.description,
        isActive: !role.is_active,
        displayOrder: role.display_order,
      });
      await fetchRoles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.name_ar?.includes(searchQuery),
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
          <Briefcase className="w-5 h-5 text-primary" />
          {t("admin.config.jobRoles")}
          <Badge variant="secondary" className="ms-2">
            {roles.length}
          </Badge>
        </CardTitle>
        <Button
          onClick={() => handleOpenDialog()}
          size="sm"
          className="min-h-[44px]"
        >
          <Plus className="w-4 h-4 me-2" />
          <span className="hidden sm:inline">{t("admin.config.addRole")}</span>
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
            placeholder={t("admin.config.searchRoles")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? "pr-9" : "pl-9"} min-h-[44px]`}
          />
        </div>

        {/* Roles List */}
        {filteredRoles.length === 0 ? (
          <InlineEmptyState
            icon={Briefcase}
            message={
              searchQuery
                ? t("admin.config.noRolesFound")
                : t("admin.config.noRolesYet")
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors min-h-[60px]"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0 hidden sm:block" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">
                      {role.name}
                    </p>
                    {role.name_ar && (
                      <span className="text-sm text-muted-foreground">
                        ({role.name_ar})
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {role.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={role.is_active}
                    onCheckedChange={() => handleToggleActive(role)}
                    aria-label={t("admin.config.toggleActive")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(role)}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(role)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingRole
                ? t("admin.config.editRole")
                : t("admin.config.addRole")}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? t("admin.config.editRoleDesc")
                : t("admin.config.addRoleDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.config.roleName")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("admin.config.roleNamePlaceholder")}
                required
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">{t("admin.config.roleNameAr")}</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) =>
                  setFormData({ ...formData, name_ar: e.target.value })
                }
                placeholder={t("admin.config.roleNameArPlaceholder")}
                dir="rtl"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("admin.config.roleDescription")}
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("admin.config.roleDescriptionPlaceholder")}
                className="min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <Label htmlFor="is_active" className="cursor-pointer">
                {t("admin.config.activeRole")}
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
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
                ) : editingRole ? (
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

export default JobRolesManagement;

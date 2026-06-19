import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Search,
  Users,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  deleteAdminCatalogItem,
  listAdminCatalogItems,
  saveAdminCatalogItem,
} from "@/lib/admin-catalogs";

interface DocumentType {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  is_required: boolean;
  applies_to: string;
  is_active: boolean;
  display_order: number;
  allowed_extensions: string[] | null;
  max_size_mb: number | null;
  created_at: string;
}

const EXTENSION_OPTIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
];

const DocumentTypesManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAppliesTo, setFilterAppliesTo] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    is_required: false,
    applies_to: "both",
    is_active: true,
    allowed_extensions: ["pdf", "jpg", "jpeg", "png"] as string[],
    max_size_mb: 10,
  });

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      setDocumentTypes(await listAdminCatalogItems("document_type"));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (docType?: DocumentType) => {
    if (docType) {
      setEditingType(docType);
      setFormData({
        name: docType.name,
        name_ar: docType.name_ar || "",
        description: docType.description || "",
        is_required: docType.is_required,
        applies_to: docType.applies_to,
        is_active: docType.is_active,
        allowed_extensions:
          docType.allowed_extensions && docType.allowed_extensions.length > 0
            ? docType.allowed_extensions
            : ["pdf", "jpg", "jpeg", "png"],
        max_size_mb: docType.max_size_mb ?? 10,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: "",
        name_ar: "",
        description: "",
        is_required: false,
        applies_to: "both",
        is_active: true,
        allowed_extensions: ["pdf", "jpg", "jpeg", "png"],
        max_size_mb: 10,
      });
    }
    setIsDialogOpen(true);
  };

  const toggleExtension = (ext: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_extensions: prev.allowed_extensions.includes(ext)
        ? prev.allowed_extensions.filter((e) => e !== ext)
        : [...prev.allowed_extensions, ext],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (formData.allowed_extensions.length === 0) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t(
          "admin.config.atLeastOneExtension",
          "Select at least one allowed file type.",
        ),
      });
      return;
    }
    const size = Math.max(1, Math.min(100, Number(formData.max_size_mb) || 10));

    setIsSubmitting(true);
    try {
      const payload = {
        kind: "document_type" as const,
        name: formData.name,
        nameAr: formData.name_ar || null,
        description: formData.description || null,
        isRequired: formData.is_required,
        appliesTo: formData.applies_to,
        isActive: formData.is_active,
        allowedExtensions: formData.allowed_extensions,
        maxSizeMb: size,
      };

      if (editingType) {
        await saveAdminCatalogItem({
          ...payload,
          id: editingType.id,
          displayOrder: editingType.display_order,
        });
        toast({ title: t("admin.config.documentTypeUpdated") });
      } else {
        await saveAdminCatalogItem({
          ...payload,
          displayOrder: documentTypes.length,
        });
        toast({ title: t("admin.config.documentTypeCreated") });
      }

      setIsDialogOpen(false);
      fetchDocumentTypes();
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

  const handleDelete = async (docType: DocumentType) => {
    if (!confirm(t("admin.config.confirmDeleteDocType"))) return;

    try {
      await deleteAdminCatalogItem(docType.id);
      toast({ title: t("admin.config.documentTypeDeleted") });
      fetchDocumentTypes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const handleToggleActive = async (docType: DocumentType) => {
    try {
      await saveAdminCatalogItem({
        id: docType.id,
        kind: "document_type",
        name: docType.name,
        nameAr: docType.name_ar,
        description: docType.description,
        isRequired: docType.is_required,
        appliesTo: docType.applies_to,
        isActive: !docType.is_active,
        allowedExtensions: docType.allowed_extensions ?? [],
        maxSizeMb: docType.max_size_mb ?? 10,
        displayOrder: docType.display_order,
      });
      fetchDocumentTypes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const getAppliesToIcon = (appliesTo: string) => {
    switch (appliesTo) {
      case "professional":
        return <Users className="w-3 h-3" />;
      case "clinic":
        return <Building2 className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getAppliesToLabel = (appliesTo: string) => {
    switch (appliesTo) {
      case "professional":
        return t("admin.roles.professional");
      case "clinic":
        return t("admin.roles.clinic");
      default:
        return t("admin.config.both");
    }
  };

  const filteredTypes = documentTypes.filter((docType) => {
    const matchesSearch =
      docType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docType.name_ar?.includes(searchQuery);
    const matchesFilter =
      filterAppliesTo === "all" || docType.applies_to === filterAppliesTo;
    return matchesSearch && matchesFilter;
  });

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
          <FileText className="w-5 h-5 text-primary" />
          {t("admin.config.documentTypes")}
          <Badge variant="secondary" className="ms-2">
            {documentTypes.length}
          </Badge>
        </CardTitle>
        <Button
          onClick={() => handleOpenDialog()}
          size="sm"
          className="min-h-[44px]"
        >
          <Plus className="w-4 h-4 me-2" />
          <span className="hidden sm:inline">
            {t("admin.config.addDocType")}
          </span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
            />
            <Input
              placeholder={t("admin.config.searchDocTypes")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRTL ? "pr-9" : "pl-9"} min-h-[44px]`}
            />
          </div>
          <Select value={filterAppliesTo} onValueChange={setFilterAppliesTo}>
            <SelectTrigger className="w-full sm:w-40 min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.config.allTypes")}</SelectItem>
              <SelectItem value="professional">
                {t("admin.roles.professional")}
              </SelectItem>
              <SelectItem value="clinic">{t("admin.roles.clinic")}</SelectItem>
              <SelectItem value="both">{t("admin.config.both")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Document Types List */}
        {filteredTypes.length === 0 ? (
          <InlineEmptyState
            icon={FileText}
            message={
              searchQuery
                ? t("admin.config.noDocTypesFound")
                : t("admin.config.noDocTypesYet")
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredTypes.map((docType) => (
              <div
                key={docType.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors min-h-[60px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">
                      {docType.name}
                    </p>
                    {docType.name_ar && (
                      <span className="text-sm text-muted-foreground">
                        ({docType.name_ar})
                      </span>
                    )}
                    {docType.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        {t("common.required")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-xs flex items-center gap-1"
                    >
                      {getAppliesToIcon(docType.applies_to)}
                      {getAppliesToLabel(docType.applies_to)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {(
                        docType.allowed_extensions ?? [
                          "pdf",
                          "jpg",
                          "jpeg",
                          "png",
                        ]
                      )
                        .join(", ")
                        .toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      ≤ {docType.max_size_mb ?? 10} MB
                    </Badge>
                    {docType.description && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {docType.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={docType.is_active}
                    onCheckedChange={() => handleToggleActive(docType)}
                    aria-label={t("admin.config.toggleActive")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(docType)}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(docType)}
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
        <DialogContent dir={isRTL ? "rtl" : "ltr"} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType
                ? t("admin.config.editDocType")
                : t("admin.config.addDocType")}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? t("admin.config.editDocTypeDesc")
                : t("admin.config.addDocTypeDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.config.docTypeName")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("admin.config.docTypeNamePlaceholder")}
                required
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">{t("admin.config.docTypeNameAr")}</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) =>
                  setFormData({ ...formData, name_ar: e.target.value })
                }
                placeholder={t("admin.config.docTypeNameArPlaceholder")}
                dir="rtl"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("admin.config.docTypeDescription")}
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("admin.config.docTypeDescriptionPlaceholder")}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applies_to">{t("admin.config.appliesTo")}</Label>
              <Select
                value={formData.applies_to}
                onValueChange={(v) =>
                  setFormData({ ...formData, applies_to: v })
                }
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t("admin.config.both")}</SelectItem>
                  <SelectItem value="professional">
                    {t("admin.roles.professional")}
                  </SelectItem>
                  <SelectItem value="clinic">
                    {t("admin.roles.clinic")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {t("admin.config.allowedExtensions", "Allowed file types")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {EXTENSION_OPTIONS.map((ext) => {
                  const active = formData.allowed_extensions.includes(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => toggleExtension(ext)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px] ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/40"
                      }`}
                      aria-pressed={active}
                    >
                      .{ext}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "admin.config.allowedExtensionsHint",
                  "Users will only be allowed to upload files in these formats.",
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_size_mb">
                {t("admin.config.maxSizeMb", "Maximum file size (MB)")}
              </Label>
              <Input
                id="max_size_mb"
                type="number"
                min={1}
                max={100}
                value={formData.max_size_mb}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_size_mb: Number(e.target.value) || 10,
                  })
                }
                className="min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <Label htmlFor="is_required" className="cursor-pointer">
                {t("admin.config.requiredDocument")}
              </Label>
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <Label htmlFor="is_active" className="cursor-pointer">
                {t("admin.config.activeDocType")}
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
                ) : editingType ? (
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

export default DocumentTypesManagement;

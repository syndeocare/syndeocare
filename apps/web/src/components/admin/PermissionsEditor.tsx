import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Permissions {
  can_verify_professionals: boolean;
  can_verify_clinics: boolean;
  can_verify_documents: boolean;
  can_manage_admins: boolean;
  can_view_analytics: boolean;
}

interface PermissionsEditorProps {
  permissions: Permissions;
  onSave: (permissions: Permissions) => Promise<void>;
  isSuperAdmin?: boolean;
  disabled?: boolean;
}

const PermissionsEditor = ({
  permissions,
  onSave,
  isSuperAdmin = false,
  disabled = false,
}: PermissionsEditorProps) => {
  const { t } = useTranslation();
  const [localPermissions, setLocalPermissions] =
    useState<Permissions>(permissions);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (key: keyof Permissions) => {
    if (disabled) return;
    setLocalPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localPermissions);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const permissionItems = [
    {
      key: "can_verify_professionals" as const,
      label: t("admin.permissions.verifyProfessionals"),
      description: t("admin.permissions.verifyProfessionalsDesc"),
    },
    {
      key: "can_verify_clinics" as const,
      label: t("admin.permissions.verifyClinics"),
      description: t("admin.permissions.verifyClinicsDesc"),
    },
    {
      key: "can_verify_documents" as const,
      label: t("admin.permissions.verifyDocuments"),
      description: t("admin.permissions.verifyDocumentsDesc"),
    },
    {
      key: "can_view_analytics" as const,
      label: t("admin.permissions.viewAnalytics"),
      description: t("admin.permissions.viewAnalyticsDesc"),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "can_manage_admins" as const,
            label: t("admin.permissions.manageAdmins"),
            description: t("admin.permissions.manageAdminsDesc"),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {permissionItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
          >
            <div className="space-y-0.5">
              <Label className="text-foreground font-medium">
                {item.label}
              </Label>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Switch
              checked={localPermissions[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {hasChanges && !disabled && (
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin me-2" />
          ) : (
            <Save className="w-4 h-4 me-2" />
          )}
          {t("common.save")}
        </Button>
      )}
    </div>
  );
};

export default PermissionsEditor;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  Loader2,
  Settings,
  Trash2,
  Search,
  Users,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import PermissionsEditor from "./PermissionsEditor";
import { InlineEmptyState } from "@/components/ui/empty-state";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  permissions?: {
    can_verify_professionals: boolean;
    can_verify_clinics: boolean;
    can_verify_documents: boolean;
    can_manage_admins: boolean;
    can_view_analytics: boolean;
  };
}

const AdminManagement = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = userRole === "super_admin" || userRole === "admin";

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  const fetchAdmins = async () => {
    try {
      // Fetch all admin and super_admin roles
      const { data: roles, error: rolesError } = await backendDb
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "super_admin"])
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch permissions for each admin
      const adminsWithPermissions = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: permissions } = await backendDb
            .from("admin_permissions")
            .select("*")
            .eq("user_id", role.user_id)
            .single();

          // Get user email from auth (we'll use profiles or clinics as fallback)
          let email = "Unknown";
          const { data: profile } = await backendDb
            .from("profiles")
            .select("email")
            .eq("user_id", role.user_id)
            .single();

          if (profile) {
            email = profile.email;
          } else {
            const { data: clinic } = await backendDb
              .from("clinics")
              .select("email")
              .eq("user_id", role.user_id)
              .single();
            if (clinic) email = clinic.email;
          }

          return {
            id: role.id,
            user_id: role.user_id,
            email,
            role: role.role,
            created_at: role.created_at,
            permissions: permissions || {
              can_verify_professionals: true,
              can_verify_clinics: true,
              can_verify_documents: true,
              can_manage_admins: false,
              can_view_analytics: false,
            },
          };
        }),
      );

      setAdmins(adminsWithPermissions);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;

    setIsAddingAdmin(true);
    try {
      // In a real app, you would:
      // 1. Check if user exists
      // 2. Send invitation email
      // 3. Create admin role when they accept

      // For now, we'll show a success message
      toast({
        title: t("admin.team.inviteSent"),
        description: t("admin.team.inviteSentDesc", { email: newAdminEmail }),
      });

      setNewAdminEmail("");
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleUpdatePermissions = async (
    permissions: AdminUser["permissions"],
  ) => {
    if (!selectedAdmin || !permissions) return;

    try {
      // Check if permissions record exists
      const { data: existing } = await backendDb
        .from("admin_permissions")
        .select("id")
        .eq("user_id", selectedAdmin.user_id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await backendDb
          .from("admin_permissions")
          .update(permissions)
          .eq("user_id", selectedAdmin.user_id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await backendDb.from("admin_permissions").insert({
          user_id: selectedAdmin.user_id,
          ...permissions,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      toast({
        title: t("admin.team.permissionsUpdated"),
        description: t("admin.team.permissionsUpdatedDesc"),
      });

      fetchAdmins();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const handleRemoveAdmin = async (adminUserId: string) => {
    try {
      // Remove admin role
      const { error: roleError } = await backendDb
        .from("user_roles")
        .delete()
        .eq("user_id", adminUserId)
        .eq("role", "admin");

      if (roleError) throw roleError;

      // Remove permissions
      await backendDb
        .from("admin_permissions")
        .delete()
        .eq("user_id", adminUserId);

      toast({
        title: t("admin.team.removed"),
        description: t("admin.team.removedDesc"),
      });

      fetchAdmins();
      setIsManageDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const filteredAdmins = admins.filter((admin) =>
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t("admin.team.superAdminOnly")}
        </h3>
        <p className="text-muted-foreground">
          {t("admin.team.superAdminOnlyDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t("admin.team.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("admin.team.subtitle")}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 me-2" />
              {t("admin.team.addAdmin")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.team.inviteAdmin")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                <Input
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAddAdmin}
                disabled={!newAdminEmail.trim() || isAddingAdmin}
                className="w-full"
              >
                {isAddingAdmin ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Mail className="w-4 h-4 me-2" />
                )}
                {t("admin.team.sendInvite")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
        />
        <Input
          placeholder={t("admin.team.searchAdmins")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={isRTL ? "pr-9" : "pl-9"}
        />
      </div>

      {/* Admins List */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8">
            <InlineEmptyState icon={Users} message={t("admin.team.noAdmins")} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      admin.role === "super_admin"
                        ? "bg-primary/10"
                        : "bg-secondary"
                    }`}
                  >
                    {admin.role === "super_admin" ? (
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    ) : (
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{admin.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          admin.role === "super_admin" ? "default" : "secondary"
                        }
                      >
                        {admin.role === "super_admin"
                          ? t("admin.roles.superAdmin")
                          : t("admin.roles.admin")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(admin.created_at).toLocaleDateString(
                          isRTL ? "ar-SA" : "en-US",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {admin.role !== "super_admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAdmin(admin);
                      setIsManageDialogOpen(true);
                    }}
                  >
                    <Settings className="w-4 h-4 me-2" />
                    {t("admin.team.manage")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Admin Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t("admin.team.manageAdmin")}
            </DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    {selectedAdmin.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.roles.admin")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-4">
                  {t("admin.team.permissions")}
                </h4>
                <PermissionsEditor
                  permissions={
                    selectedAdmin.permissions || {
                      can_verify_professionals: true,
                      can_verify_clinics: true,
                      can_verify_documents: true,
                      can_manage_admins: false,
                      can_view_analytics: false,
                    }
                  }
                  onSave={handleUpdatePermissions}
                  isSuperAdmin={true}
                />
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleRemoveAdmin(selectedAdmin.user_id)}
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  {t("admin.team.removeAdmin")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagement;

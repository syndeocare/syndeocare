import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Note {
  id: string;
  target_user_id: string;
  target_type: string;
  admin_id: string;
  note: string;
  note_type: string;
  created_at: string;
  admin_name?: string;
}

interface AdminNotesProps {
  targetUserId: string;
  targetType: "professional" | "clinic";
}

const AdminNotes = ({ targetUserId, targetType }: AdminNotesProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = userRole === "super_admin";

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<string>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [targetUserId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await backendDb
        .from("admin_notes")
        .select("*")
        .eq("target_user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newNote.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await backendDb.from("admin_notes").insert({
        target_user_id: targetUserId,
        target_type: targetType,
        admin_id: user.id,
        note: newNote.trim(),
        note_type: noteType,
      });

      if (error) throw error;

      toast({
        title: t("admin.notes.added"),
        description: t("admin.notes.addedDesc"),
      });

      setNewNote("");
      fetchNotes();
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

  const handleDelete = async (noteId: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await backendDb
        .from("admin_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: t("admin.notes.deleted"),
        description: t("admin.notes.deletedDesc"),
      });

      fetchNotes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "verification":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "follow_up":
        return <Clock className="w-4 h-4 text-primary" />;
      default:
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNoteTypeBadge = (type: string) => {
    switch (type) {
      case "warning":
        return (
          <Badge variant="destructive">{t("admin.notes.types.warning")}</Badge>
        );
      case "verification":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            {t("admin.notes.types.verification")}
          </Badge>
        );
      case "follow_up":
        return (
          <Badge variant="secondary">{t("admin.notes.types.followUp")}</Badge>
        );
      default:
        return (
          <Badge variant="outline">{t("admin.notes.types.general")}</Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-foreground flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        {t("admin.notes.title")}
      </h4>

      {/* Add New Note */}
      <div className="space-y-3 p-4 rounded-lg bg-secondary/50">
        <Textarea
          placeholder={t("admin.notes.placeholder")}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="general">{t("admin.notes.types.general")}</option>
            <option value="warning">{t("admin.notes.types.warning")}</option>
            <option value="verification">
              {t("admin.notes.types.verification")}
            </option>
            <option value="follow_up">{t("admin.notes.types.followUp")}</option>
          </select>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newNote.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 me-2" />
                {t("admin.notes.add")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("admin.notes.empty")}
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-lg bg-background border border-border"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getNoteTypeIcon(note.note_type)}
                  {getNoteTypeBadge(note.note_type)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString(
                      isRTL ? "ar-SA" : "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground">{note.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotes;

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Image, File, Loader2, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadChatMediaToStorage } from "@/lib/storage";

interface ChatMediaUploadProps {
  conversationId: string;
  onUploadComplete: (
    fileUrl: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    previewUrl?: string,
  ) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ChatMediaUpload = ({
  conversationId,
  onUploadComplete,
  disabled,
}: ChatMediaUploadProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: t("chat.fileTooLarge"),
        description: t("chat.maxFileSize", { size: "10MB" }),
      });
      return;
    }
    await uploadFile(file);
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(15);
    try {
      // Auto-optimize image uploads for chat
      let toUpload: File = file;
      if (file.type.startsWith("image/") && file.type !== "image/gif") {
        const { optimizeImage } = await import("@/lib/imageOptimization");
        toUpload = await optimizeImage(file, {
          maxWidthOrHeight: 1920,
          maxSizeMB: 1.2,
          quality: 0.82,
        });
      }
      setUploadProgress(45);
      const previewUrl = toUpload.type.startsWith("image/")
        ? URL.createObjectURL(toUpload)
        : undefined;
      const fileUrl = await uploadChatMediaToStorage(toUpload, conversationId);
      setUploadProgress(100);
      onUploadComplete(
        fileUrl,
        toUpload.name,
        toUpload.type,
        toUpload.size,
        previewUrl,
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: t("chat.uploadError"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
    } finally {
      window.setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 250);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || uploading}
            className="shrink-0 h-12 w-12 min-h-[48px] min-w-[48px]"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Image className="h-4 w-4 me-2" />
            {t("chat.uploadImage")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
            <Video className="h-4 w-4 me-2" />
            {t("chat.uploadVideo")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <File className="h-4 w-4 me-2" />
            {t("chat.uploadFile")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {uploading && (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-lg border bg-background/95 p-2 shadow-lg md:absolute md:bottom-20">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{t("chat.uploadingFile", "Uploading file")}</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </>
  );
};

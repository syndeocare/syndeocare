import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User, X } from "lucide-react";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ImageCropper } from "@/components/ui/image-cropper";
import { optimizeImage } from "@/lib/imageOptimization";
import { uploadAvatarToStorage, type AvatarUploadResult } from "@/lib/storage";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onUpload: (upload: AvatarUploadResult) => void;
  size?: "sm" | "md" | "lg";
  name?: string;
}

const MAX_INPUT_MB = 10;
const AVATAR_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

const AvatarUpload = ({
  userId,
  currentAvatarUrl,
  onUpload,
  size = "lg",
  name = "",
}: AvatarUploadProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.uploadPhoto"),
      });
      return;
    }
    if (file.size > MAX_INPUT_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("documents.fileTooLarge", { max: MAX_INPUT_MB }),
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);

    // reset input so selecting the same file again still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropped = async (blob: Blob) => {
    setCropSrc(null);
    setIsUploading(true);
    try {
      const cropped = new File([blob], `avatar_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const optimized = await optimizeImage(cropped, {
        maxWidthOrHeight: 512,
        maxSizeMB: 0.3,
        quality: 0.88,
        mimeType: "image/jpeg",
      });

      const localPreview = URL.createObjectURL(optimized);
      setPreviewUrl(localPreview);

      const upload = await uploadAvatarToStorage(optimized, "avatar");
      onUpload(upload);

      toast({
        title: t("profile.photoUploaded"),
        description: t("profile.photoUploadedDesc"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("documents.uploadFailed"),
        description: error instanceof Error ? error.message : t("common.error"),
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => setPreviewUrl(null);

  const displayUrl = previewUrl || currentAvatarUrl;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar
          className={`${sizeClasses[size]} border-4 border-background shadow-lg`}
        >
          <AvatarImage src={displayUrl || undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
            {initials || <User className="w-8 h-8" />}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {previewUrl && !isUploading && (
          <button
            type="button"
            onClick={clearPreview}
            className="absolute -top-1 -end-1 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 transition-colors"
            aria-label={t("common.delete")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        {currentAvatarUrl || previewUrl
          ? t("profile.changePhoto")
          : t("profile.uploadPhoto")}
      </Button>

      <ImageCropper
        open={!!cropSrc}
        imageSrc={cropSrc}
        aspect={1}
        cropShape="round"
        outputSize={512}
        onCancel={() => setCropSrc(null)}
        onCropped={handleCropped}
      />
    </div>
  );
};

export default AvatarUpload;

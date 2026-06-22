import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Image,
  File,
  Link as LinkIcon,
  Download,
  ExternalLink,
  X,
  Video,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  getChatMediaAccessUrl,
  isS3StorageUri,
  resolveMediaUrl,
} from "@/lib/storage";

interface MediaItem {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  content: string;
}

interface ChatMediaGalleryProps {
  conversationId: string;
  conversationKind: "standard" | "admin";
  isOpen: boolean;
  onClose: () => void;
}

export const ChatMediaGallery = ({
  conversationId,
  conversationKind,
  isOpen,
  onClose,
}: ChatMediaGalleryProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [loading, setLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<
    Record<string, string>
  >({});

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const table =
        conversationKind === "admin" ? "admin_messages" : "messages";
      const conversationColumn =
        conversationKind === "admin"
          ? "admin_conversation_id"
          : "conversation_id";
      const { data, error } = await backendDb
        .from(table)
        .select(
          "id, file_url, file_name, file_type, file_size, created_at, content",
        )
        .eq(conversationColumn, conversationId)
        .not("file_url", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMediaItems(data || []);
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, conversationKind]);

  useEffect(() => {
    if (isOpen) void fetchMedia();
  }, [fetchMedia, isOpen]);

  useEffect(() => {
    const s3Urls = Array.from(
      new Set(
        mediaItems
          .map((item) => item.file_url)
          .filter((value) => isS3StorageUri(value))
          .filter((value) => !resolvedMediaUrls[value]),
      ),
    );

    if (!isOpen || s3Urls.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveUrls = async () => {
      const entries = await Promise.all(
        s3Urls.map(async (fileUrl) => {
          try {
            return [
              fileUrl,
              await getChatMediaAccessUrl(conversationId, fileUrl),
            ] as const;
          } catch (error) {
            console.warn("Unable to resolve chat media gallery URL", error);
            return [fileUrl, fileUrl] as const;
          }
        }),
      );

      if (!cancelled) {
        setResolvedMediaUrls((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      }
    };

    void resolveUrls();

    return () => {
      cancelled = true;
    };
  }, [conversationId, isOpen, mediaItems, resolvedMediaUrls]);

  const images = mediaItems.filter((i) => i.file_type?.startsWith("image/"));
  const videos = mediaItems.filter(
    (i) =>
      i.file_type?.startsWith("video/") || i.file_type?.startsWith("audio/"),
  );
  const files = mediaItems.filter(
    (i) =>
      i.file_type &&
      !i.file_type.startsWith("image/") &&
      !i.file_type.startsWith("video/") &&
      !i.file_type.startsWith("audio/"),
  );

  const extractLinks = () => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links: { url: string; content: string; created_at: string }[] = [];
    mediaItems.forEach((item) => {
      if (item.content) {
        const matches = item.content.match(urlRegex);
        matches?.forEach((url) =>
          links.push({
            url,
            content: item.content,
            created_at: item.created_at,
          }),
        );
      }
    });
    return links;
  };
  const links = extractLinks();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getResolvedMediaUrl = (fileUrl: string) =>
    resolvedMediaUrls[fileUrl] ?? resolveMediaUrl(fileUrl) ?? fileUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="sm:max-w-lg max-h-[80vh]"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <DialogTitle className="text-lg font-semibold">
            {t("chat.mediaAndFiles")}
          </DialogTitle>
          <Tabs defaultValue="images" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="images"
                className="flex items-center gap-1 text-xs"
              >
                <Image className="h-3.5 w-3.5" />
                {images.length}
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="flex items-center gap-1 text-xs"
              >
                <Video className="h-3.5 w-3.5" />
                {videos.length}
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="flex items-center gap-1 text-xs"
              >
                <File className="h-3.5 w-3.5" />
                {files.length}
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="flex items-center gap-1 text-xs"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                {links.length}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="images" className="mt-0">
                {loading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : images.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("chat.noImages")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        onClick={() =>
                          setSelectedImage(getResolvedMediaUrl(img.file_url))
                        }
                        className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={getResolvedMediaUrl(img.file_url)}
                          alt={img.file_name || ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="videos" className="mt-0 space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("chat.noVideos")}</p>
                  </div>
                ) : (
                  videos.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg overflow-hidden bg-muted"
                    >
                      {v.file_type?.startsWith("video/") ? (
                        <video
                          controls
                          preload="metadata"
                          className="w-full max-h-48 rounded-lg"
                        >
                          <source
                            src={getResolvedMediaUrl(v.file_url)}
                            type={v.file_type}
                          />
                        </video>
                      ) : (
                        <div className="p-3">
                          <audio controls preload="metadata" className="w-full">
                            <source
                              src={getResolvedMediaUrl(v.file_url)}
                              type={v.file_type}
                            />
                          </audio>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground p-2">
                        {v.file_name} •{" "}
                        {format(new Date(v.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="files" className="mt-0 space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("chat.noFiles")}</p>
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <File className="h-10 w-10 p-2 bg-background rounded shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} •{" "}
                          {format(new Date(file.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={getResolvedMediaUrl(file.file_url)}
                          download={file.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="links" className="mt-0 space-y-2">
                {links.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("chat.noLinks")}</p>
                  </div>
                ) : (
                  links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <LinkIcon className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary truncate">
                          {link.url}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(link.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 end-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

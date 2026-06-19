import imageCompression from "browser-image-compression";

export interface OptimizeOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  quality?: number; // 0-1 (applied via initialQuality)
  mimeType?: string; // force output type, e.g. "image/jpeg"
}

const DEFAULTS: Required<Omit<OptimizeOptions, "mimeType">> & {
  mimeType?: string;
} = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 1.5,
  quality: 0.82,
};

/**
 * Compress and resize an image File in the browser.
 * Returns the original file if it is not an image or already small enough.
 */
export async function optimizeImage(
  file: File,
  opts: OptimizeOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Skip GIF/SVG to preserve animations/vectors.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const o = { ...DEFAULTS, ...opts };

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: o.maxSizeMB,
      maxWidthOrHeight: o.maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: o.quality,
      fileType: o.mimeType,
      alwaysKeepResolution: false,
    });

    // Ensure we still return a File (some browsers give Blob)
    const finalName = renameExtensionIfNeeded(file.name, compressed.type);
    if (compressed instanceof File && compressed.name === finalName)
      return compressed;
    return new File([compressed], finalName, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[optimizeImage] failed, falling back to original:", err);
    return file;
  }
}

function renameExtensionIfNeeded(name: string, mime: string): string {
  if (!mime) return name;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = map[mime];
  if (!ext) return name;
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.${ext}`;
}

/** Convert a base64/dataURL or blob URL to a File (used after cropping). */
export async function urlToFile(
  url: string,
  filename: string,
  mime = "image/jpeg",
): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: mime });
}

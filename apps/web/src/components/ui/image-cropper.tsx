import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageCropperProps {
  open: boolean;
  imageSrc: string | null;
  aspect?: number;
  cropShape?: "rect" | "round";
  outputSize?: number; // final width in px (height = width / aspect)
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

/**
 * Modal image cropper. Returns a JPEG Blob of the cropped region.
 */
export function ImageCropper({
  open,
  imageSrc,
  aspect = 1,
  cropShape = "round",
  outputSize = 512,
  onCancel,
  onCropped,
}: ImageCropperProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(
        imageSrc,
        croppedAreaPixels,
        rotation,
        outputSize,
        aspect,
      );
      onCropped(blob);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("imageCropper.title", "Adjust your photo")}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[320px] bg-muted rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="w-full"
          >
            <RotateCw className="w-4 h-4 me-2" />
            {t("imageCropper.rotate", "Rotate")}
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("imageCropper.apply", "Apply")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getCroppedBlob(
  imageSrc: string,
  area: Area,
  rotation: number,
  outputSize: number,
  aspect: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const radians = (rotation * Math.PI) / 180;

  // Render rotated source to an offscreen canvas at native size
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const bboxW = image.width * cos + image.height * sin;
  const bboxH = image.width * sin + image.height * cos;

  const off = document.createElement("canvas");
  off.width = bboxW;
  off.height = bboxH;
  const offCtx = off.getContext("2d")!;
  offCtx.translate(bboxW / 2, bboxH / 2);
  offCtx.rotate(radians);
  offCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const out = document.createElement("canvas");
  out.width = outputSize;
  out.height = Math.round(outputSize / aspect);
  const outCtx = out.getContext("2d")!;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(
    off,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    out.width,
    out.height,
  );

  return new Promise<Blob>((resolve) => {
    out.toBlob((b) => resolve(b!), "image/jpeg", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

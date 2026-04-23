import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Upload, RotateCw, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 512;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => void;
}

async function getCroppedImage(
  src: string,
  crop: Area,
  rotation: number,
): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

  // Rotated canvas for source
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bBoxW = img.width * cos + img.height * sin;
  const bBoxH = img.width * sin + img.height * cos;

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = bBoxW;
  rotCanvas.height = bBoxH;
  const rotCtx = rotCanvas.getContext("2d")!;
  rotCtx.translate(bBoxW / 2, bBoxH / 2);
  rotCtx.rotate(rad);
  rotCtx.drawImage(img, -img.width / 2, -img.height / 2);

  // Output canvas
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const outCtx = out.getContext("2d")!;
  outCtx.drawImage(
    rotCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise<File>((resolve, reject) => {
    out.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("EXPORT_BLOB_NULL"));
        resolve(new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  });
}

export function AvatarUploadDialog({ open, onOpenChange, onUpload }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setPreviewUrl(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      const ext = file.name.split(".").pop()?.toUpperCase() || "inconnu";
      toast({
        title: "Format d'image non pris en charge",
        description: `Le format « ${ext} » n'est pas accepté. Veuillez utiliser une image au format JPG, PNG ou WebP.`,
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_SIZE) {
      const sizeMo = (file.size / (1024 * 1024)).toFixed(1);
      toast({
        title: "Image trop volumineuse",
        description: `Votre image fait ${sizeMo} Mo. La taille maximale autorisée est de 5 Mo. Essayez de la compresser ou de la redimensionner.`,
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.onerror = () => {
      toast({
        title: "Lecture impossible",
        description: "Impossible de lire ce fichier. Il est peut-être corrompu, essayez une autre image.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste support
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
      if (item) {
        const file = item.getAsFile();
        if (file) handleFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, handleFile]);

  // Live preview when crop changes
  useEffect(() => {
    if (!imageSrc || !croppedAreaPixels) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const file = await getCroppedImage(imageSrc, croppedAreaPixels, rotation);
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // ignore
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [imageSrc, croppedAreaPixels, rotation]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleValidate = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const file = await getCroppedImage(imageSrc, croppedAreaPixels, rotation);
      onUpload(file);
      onOpenChange(false);
    } catch (err) {
      const reason = err instanceof Error && err.message === "EXPORT_BLOB_NULL"
        ? "Le navigateur n'a pas pu générer l'image finale."
        : "Une erreur est survenue pendant le recadrage.";
      toast({
        title: "Échec de l'export en 512×512",
        description: `${reason} Essayez avec une autre image ou rechargez la page.`,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{imageSrc ? "Recadrer la photo" : "Ajouter une photo"}</DialogTitle>
          <DialogDescription>
            {imageSrc
              ? "Ajustez le cadrage et le zoom. L'image sera exportée en 512×512."
              : "Glissez une image, collez-la (Ctrl/Cmd+V) ou parcourez vos fichiers."}
          </DialogDescription>
        </DialogHeader>

        {!imageSrc ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent/50",
            )}
          >
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Glissez une image ici</p>
              <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — 5 Mo max</p>
            <p className="text-xs text-muted-foreground">Astuce : collez une image avec Ctrl/Cmd+V</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1 h-72 bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="flex flex-col items-center gap-2 w-24">
                <p className="text-xs font-medium text-muted-foreground">Aperçu</p>
                <div className="h-20 w-20 rounded-full border-2 border-primary overflow-hidden bg-muted flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Aperçu" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Zoom</label>
                <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}×</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(v) => setZoom(v[0])}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw className="h-4 w-4" />
                Pivoter 90°
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Choisir une autre image
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {imageSrc && (
            <Button type="button" onClick={handleValidate} disabled={busy || !croppedAreaPixels}>
              {busy ? "Traitement…" : "Valider"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

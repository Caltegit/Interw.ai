import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface Props {
  orgId: string;
  currentLogoUrl: string | null;
  canEdit: boolean;
  onUploaded: (url: string | null) => void;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

async function resizeIfNeeded(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 512;
      let { width, height } = img;
      if (width <= max && height <= max) return resolve(file);
      const ratio = Math.min(max / width, max / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : resolve(file)), file.type, 0.9);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function OrgLogoUpload({ orgId, currentLogoUrl, canEdit, onUploaded }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Format non supporté", description: "PNG, JPG, WEBP ou SVG uniquement.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 2 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const blob = await resizeIfNeeded(file);
      const ext = file.name.split(".").pop() || "png";
      const path = `org-logos/${orgId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, blob, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("organizations")
        .update({ logo_url: pub.publicUrl })
        .eq("id", orgId);
      if (updErr) throw updErr;
      onUploaded(pub.publicUrl);
      toast({ title: "Logo mis à jour !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { error } = await supabase.from("organizations").update({ logo_url: null }).eq("id", orgId);
      if (error) throw error;
      onUploaded(null);
      toast({ title: "Logo retiré" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Logo de l'organisation</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-border bg-muted overflow-hidden">
          {currentLogoUrl ? (
            <img src={currentLogoUrl} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Envoi..." : currentLogoUrl ? "Changer" : "Téléverser"}
              </Button>
              {currentLogoUrl && (
                <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={handleRemove}>
                  <X className="mr-2 h-4 w-4" /> Retirer
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP ou SVG · max 2 Mo · redimensionné à 512px</p>
          </div>
        )}
      </div>
    </div>
  );
}

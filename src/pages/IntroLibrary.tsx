import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mic, Video, Plus, Trash2 } from "lucide-react";
import { IntroAudioRecorder } from "@/components/project/IntroAudioRecorder";
import { IntroVideoRecorder } from "@/components/project/IntroVideoRecorder";

interface IntroTemplate {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  type: "audio" | "video";
  audio_url: string | null;
  video_url: string | null;
  description: string | null;
  created_at: string;
}

export default function IntroLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<IntroTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"audio" | "video">("audio");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async (organizationId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intro_templates" as never)
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setItems((data as unknown as IntroTemplate[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_organization_id", { _user_id: user.id }).then(({ data }) => {
      if (data) {
        setOrgId(data);
        fetchItems(data);
      }
    });
  }, [user, fetchItems]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("audio");
    setAudioBlob(null);
    setVideoFile(null);
  };

  const handleSave = async () => {
    if (!orgId || !user) return;
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    if (type === "audio" && !audioBlob) {
      toast({ title: "Veuillez enregistrer un audio", variant: "destructive" });
      return;
    }
    if (type === "video" && !videoFile) {
      toast({ title: "Veuillez enregistrer/importer une vidéo", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const id = crypto.randomUUID();
      let audioUrl: string | null = null;
      let videoUrl: string | null = null;

      if (type === "audio" && audioBlob) {
        const path = `intro-library/${id}.webm`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, audioBlob, { contentType: "audio/webm", upsert: true });
        if (error) throw error;
        audioUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      } else if (type === "video" && videoFile) {
        const path = `intro-library/${id}.webm`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, videoFile, { contentType: videoFile.type || "video/webm", upsert: true });
        if (error) throw error;
        videoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }

      const { error: insertErr } = await supabase.from("intro_templates" as never).insert({
        id,
        organization_id: orgId,
        created_by: user.id,
        name: name.trim(),
        type,
        audio_url: audioUrl,
        video_url: videoUrl,
        description: description.trim() || null,
      } as never);

      if (insertErr) throw insertErr;

      toast({ title: "Intro ajoutée à la bibliothèque !" });
      resetForm();
      setOpen(false);
      fetchItems(orgId);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: IntroTemplate) => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;
    try {
      const url = item.audio_url || item.video_url;
      if (url) {
        const match = url.match(/intro-library\/[^/?]+/);
        if (match) await supabase.storage.from("media").remove([match[0]]);
      }
      const { error } = await supabase.from("intro_templates" as never).delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "Intro supprimée" });
      if (orgId) fetchItems(orgId);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bibliothèque d'intros</h1>
          <p className="text-muted-foreground">
            Gérez vos messages d'introduction réutilisables (audio ou vidéo).
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Nouvelle intro
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
            <DialogHeader>
              <DialogTitle>Nouvelle intro</DialogTitle>
              <DialogDescription>
                Créez une intro réutilisable que vous pourrez sélectionner lors de la création d'un projet.
              </DialogDescription>
            </DialogHeader>

            <div className="-mx-6 flex-1 space-y-4 overflow-y-auto px-6">
              <div>
                <Label>Nom *</Label>
                <Input
                  placeholder="Ex: Intro Marie - chaleureuse"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label>Type</Label>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant={type === "audio" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setType("audio");
                      setVideoFile(null);
                    }}
                  >
                    <Mic className="mr-1 h-4 w-4" /> Audio
                  </Button>
                  <Button
                    type="button"
                    variant={type === "video" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setType("video");
                      setAudioBlob(null);
                    }}
                  >
                    <Video className="mr-1 h-4 w-4" /> Vidéo
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                {type === "audio" ? (
                  <IntroAudioRecorder
                    onAudioReady={({ blob }) => setAudioBlob(blob)}
                  />
                ) : (
                  <IntroVideoRecorder
                    onVideoReady={({ file }) => setVideoFile(file)}
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune intro pour l'instant. Créez votre première intro réutilisable !
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <Badge variant={item.type === "audio" ? "secondary" : "default"}>
                    {item.type === "audio" ? (
                      <>
                        <Mic className="mr-1 h-3 w-3" /> Audio
                      </>
                    ) : (
                      <>
                        <Video className="mr-1 h-3 w-3" /> Vidéo
                      </>
                    )}
                  </Badge>
                </div>

                {item.type === "audio" && item.audio_url && (
                  <audio controls src={item.audio_url} className="w-full" />
                )}
                {item.type === "video" && item.video_url && (
                  <video controls src={item.video_url} className="w-full rounded border border-border" />
                )}

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

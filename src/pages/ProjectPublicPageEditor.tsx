import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Copy, ExternalLink, Loader2 } from "lucide-react";
import { slugify } from "@/lib/slug";
import { RichTextEditor } from "@/components/project/RichTextEditor";

interface PageRow {
  id?: string;
  enabled: boolean;
  slug_public: string;
  content: any;
  cover_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export default function ProjectPublicPageEditor() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<{ title: string; slug: string | null } | null>(null);
  const [page, setPage] = useState<PageRow>({
    enabled: false,
    slug_public: "",
    content: {},
    cover_image_url: null,
    seo_title: null,
    seo_description: null,
  });

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data: proj } = await supabase.from("projects").select("title, slug").eq("id", projectId).maybeSingle();
      if (proj) setProject(proj);

      const { data: existing } = await supabase
        .from("project_public_pages")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        setPage(existing as any);
      } else if (proj) {
        setPage((p) => ({ ...p, slug_public: `${slugify(proj.title)}-${projectId.slice(0, 6)}` }));
      }
      setLoading(false);
    })();
  }, [projectId]);

  const publicUrl = `${window.location.origin}/p/${page.slug_public}`;

  const handleSave = async () => {
    if (!projectId) return;
    if (!page.slug_public.trim()) {
      toast({ title: "Lien invalide", description: "Choisissez un identifiant pour le lien public.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      project_id: projectId,
      enabled: page.enabled,
      slug_public: page.slug_public.trim(),
      content: page.content,
      cover_image_url: page.cover_image_url,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      published_at: page.enabled ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("project_public_pages")
      .upsert(payload, { onConflict: "project_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Enregistré" });
  };

  const handleCoverUpload = async (file: File) => {
    if (!projectId) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `public-pages/${projectId}/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      toast({ title: "Échec téléversement", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setPage((p) => ({ ...p, cover_image_url: data.publicUrl }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
        </Button>
        <div className="flex gap-2">
          {page.enabled && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" /> Aperçu
              </a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Page publique</h1>
        <p className="text-muted-foreground text-sm">{project?.title}</p>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Activer la page publique</Label>
            <p className="text-sm text-muted-foreground">Une fois activée, la page est accessible à toute personne disposant du lien.</p>
          </div>
          <Switch checked={page.enabled} onCheckedChange={(v) => setPage((p) => ({ ...p, enabled: v }))} />
        </div>

        <div className="space-y-2">
          <Label>Identifiant du lien</Label>
          <Input
            value={page.slug_public}
            onChange={(e) => setPage((p) => ({ ...p, slug_public: slugify(e.target.value) }))}
            placeholder="mon-poste"
          />
          {page.enabled && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <span className="flex-1 truncate font-mono">{publicUrl}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast({ title: "Lien copié" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">Référencement</h2>
        <div className="space-y-2">
          <Label>Image de couverture</Label>
          {page.cover_image_url && (
            <img src={page.cover_image_url} alt="" className="max-h-40 rounded-md border" />
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCoverUpload(f);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Titre SEO</Label>
          <Input
            value={page.seo_title ?? ""}
            onChange={(e) => setPage((p) => ({ ...p, seo_title: e.target.value }))}
            placeholder={project?.title ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label>Description SEO</Label>
          <Textarea
            value={page.seo_description ?? ""}
            onChange={(e) => setPage((p) => ({ ...p, seo_description: e.target.value }))}
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Contenu de la page</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez texte, images et vidéos. Un bouton « Postuler à cet entretien » est ajouté automatiquement en bas de la page publique.
        </p>
        {projectId && (
          <RichTextEditor
            value={page.content}
            onChange={(json) => setPage((p) => ({ ...p, content: json }))}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}

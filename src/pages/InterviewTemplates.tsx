import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Copy, FileText, ListChecks, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  category: string | null;
  job_title: string;
  default_duration_minutes: number;
  questions_count?: number;
  criteria_count?: number;
}

export default function InterviewTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_organization_id", { _user_id: user.id }).then(({ data }) => {
      if (data) setOrgId(data);
    });
  }, [user]);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: tpls } = await supabase
      .from("interview_templates" as never)
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    const list = (tpls as unknown as InterviewTemplate[]) || [];
    if (list.length) {
      const ids = list.map((t) => t.id);
      const [{ data: qs }, { data: cs }] = await Promise.all([
        supabase.from("interview_template_questions" as never).select("template_id").in("template_id", ids),
        supabase.from("interview_template_criteria" as never).select("template_id").in("template_id", ids),
      ]);
      const qCount: Record<string, number> = {};
      const cCount: Record<string, number> = {};
      (qs as unknown as { template_id: string }[] || []).forEach((q) => {
        qCount[q.template_id] = (qCount[q.template_id] || 0) + 1;
      });
      (cs as unknown as { template_id: string }[] || []).forEach((c) => {
        cCount[c.template_id] = (cCount[c.template_id] || 0) + 1;
      });
      list.forEach((t) => {
        t.questions_count = qCount[t.id] || 0;
        t.criteria_count = cCount[t.id] || 0;
      });
    }
    setTemplates(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleCreate = async () => {
    if (!orgId || !user) return;
    const { data, error } = await supabase
      .from("interview_templates" as never)
      .insert({
        organization_id: orgId,
        created_by: user.id,
        name: "Nouvel entretien type",
        description: "",
        category: null,
        job_title: "",
        default_duration_minutes: 30,
        default_language: "fr",
      } as never)
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
      return;
    }
    navigate(`/library/interviews/${(data as { id: string }).id}`);
  };

  const handleDuplicate = async (tpl: InterviewTemplate) => {
    if (!orgId || !user) return;
    const { data: newTpl, error } = await supabase
      .from("interview_templates" as never)
      .insert({
        organization_id: orgId,
        created_by: user.id,
        name: `${tpl.name} (copie)`,
        description: tpl.description,
        category: tpl.category,
        job_title: tpl.job_title,
        default_duration_minutes: tpl.default_duration_minutes,
        default_language: "fr",
      } as never)
      .select()
      .single();
    if (error || !newTpl) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
      return;
    }
    const newId = (newTpl as { id: string }).id;

    const [{ data: srcQ }, { data: srcC }] = await Promise.all([
      supabase.from("interview_template_questions" as never).select("*").eq("template_id", tpl.id),
      supabase.from("interview_template_criteria" as never).select("*").eq("template_id", tpl.id),
    ]);

    if (srcQ && srcQ.length) {
      await supabase.from("interview_template_questions" as never).insert(
        (srcQ as Record<string, unknown>[]).map((q) => {
          const rest = { ...q };
          delete (rest as Record<string, unknown>).id;
          delete (rest as Record<string, unknown>).created_at;
          delete (rest as Record<string, unknown>).template_id;
          return { ...rest, template_id: newId };
        }) as never,
      );
    }
    if (srcC && srcC.length) {
      await supabase.from("interview_template_criteria" as never).insert(
        (srcC as Record<string, unknown>[]).map((c) => {
          const rest = { ...c };
          delete (rest as Record<string, unknown>).id;
          delete (rest as Record<string, unknown>).created_at;
          delete (rest as Record<string, unknown>).template_id;
          return { ...rest, template_id: newId };
        }) as never,
      );
    }
    toast({ title: "Modèle dupliqué" });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("interview_templates" as never).delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Modèle supprimé" });
      load();
    }
    setDeleteId(null);
  };

  const categories = Array.from(new Set(templates.map((t) => t.category).filter(Boolean) as string[]));
  const filtered = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.job_title || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Entretiens types</h1>
          <p className="text-muted-foreground">
            Modèles d'entretien réutilisables (questions + critères) pour démarrer un projet en 1 clic.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau modèle
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={categoryFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("all")}
        >
          Tous
        </Button>
        {categories.map((c) => (
          <Button
            key={c}
            variant={categoryFilter === c ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun entretien type. Créez-en un pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  {tpl.category && <Badge variant="secondary">{tpl.category}</Badge>}
                </div>
                {tpl.job_title && <CardDescription>{tpl.job_title}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                {tpl.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{tpl.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {tpl.questions_count} question(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="h-3 w-3" /> {tpl.criteria_count} critère(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {tpl.default_duration_minutes} min
                  </span>
                </div>
                <div className="flex gap-1 pt-2 mt-auto">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={`/library/interviews/${tpl.id}`}>
                      <Pencil className="mr-1 h-3 w-3" /> Modifier
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(tpl)} aria-label="Dupliquer">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(tpl.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les projets déjà créés à partir de ce modèle ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

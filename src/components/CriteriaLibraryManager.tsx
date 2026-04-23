import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Search, BookOpen } from "lucide-react";
import {
  CriterionFormDialog,
  EMPTY_CRITERION_FORM,
  type CriterionFormValue,
} from "@/components/CriterionFormDialog";

interface CriterionTemplate {
  id: string;
  label: string;
  description: string;
  weight: number;
  scoring_scale: string;
  applies_to: string;
  anchors: any;
  category: string | null;
  organization_id: string;
  created_by: string;
}

interface Props {
  orgId: string;
}

export function CriteriaLibraryManager({ orgId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CriterionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<CriterionFormValue>(EMPTY_CRITERION_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("criteria_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates((data as CriterionTemplate[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orgId) fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const openNew = () => {
    setEditingId(null);
    setInitialForm(EMPTY_CRITERION_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: CriterionTemplate) => {
    setEditingId(t.id);
    setInitialForm({
      label: t.label,
      description: t.description || "",
      weight: t.weight || 0,
      scoring_scale: t.scoring_scale,
      applies_to: t.applies_to,
      anchors: (t.anchors as Record<string, string>) || {},
      category: t.category || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (form: CriterionFormValue) => {
    if (!user) return;
    setSaving(true);
    const payload = {
      label: form.label.trim(),
      description: form.description,
      weight: form.weight,
      scoring_scale: form.scoring_scale as never,
      applies_to: form.applies_to as never,
      anchors: form.anchors,
      category: form.category || null,
    };
    const { error } = editingId
      ? await supabase.from("criteria_templates").update(payload).eq("id", editingId)
      : await supabase.from("criteria_templates").insert({ ...payload, organization_id: orgId, created_by: user.id });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Critère mis à jour" : "Critère ajouté" });
      setDialogOpen(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("criteria_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates((t) => t.filter((c) => c.id !== id));
    }
  };

  const filtered = templates.filter((t) => {
    const matchSearch =
      !search ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" /> Bibliothèque de critères
        </CardTitle>
        <CardDescription>Créez vos critères d'évaluation types ({templates.length})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {templates.length === 0 ? "Aucun critère dans la bibliothèque." : "Aucun résultat."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-lg border p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-semibold">{t.label}</p>
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                  {t.category && (
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                    </div>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CriterionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={initialForm}
        isEditing={!!editingId}
        saving={saving}
        onSubmit={handleSave}
      />
    </Card>
  );
}

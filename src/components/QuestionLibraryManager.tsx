import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Search, BookOpen, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuestionTemplate {
  id: string;
  content: string;
  category: string | null;
  follow_up_enabled: boolean;
  max_follow_ups: number;
  organization_id: string;
  created_by: string;
}

const CATEGORIES = ["Motivation", "Technique", "Soft skills", "Situationnel", "Culture fit", "Leadership"];

interface QuestionLibraryManagerProps {
  orgId: string;
}

export function QuestionLibraryManager({ orgId }: QuestionLibraryManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Add form
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newFollowUp, setNewFollowUp] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFollowUp, setEditFollowUp] = useState(true);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("question_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orgId) fetchTemplates();
  }, [orgId]);

  const handleAdd = async () => {
    if (!newContent.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from("question_templates").insert({
      content: newContent.trim(),
      category: newCategory || null,
      follow_up_enabled: newFollowUp,
      max_follow_ups: newFollowUp ? 2 : 0,
      organization_id: orgId,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewContent("");
      setNewCategory("");
      setNewFollowUp(true);
      setShowForm(false);
      fetchTemplates();
      toast({ title: "Question ajoutée à la bibliothèque !" });
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("question_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates((t) => t.filter((q) => q.id !== id));
    }
  };

  const startEdit = (t: QuestionTemplate) => {
    setEditingId(t.id);
    setEditContent(t.content);
    setEditCategory(t.category || "");
    setEditFollowUp(t.follow_up_enabled);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    const { error } = await supabase
      .from("question_templates")
      .update({
        content: editContent.trim(),
        category: editCategory || null,
        follow_up_enabled: editFollowUp,
        max_follow_ups: editFollowUp ? 2 : 0,
      })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchTemplates();
    }
  };

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" /> Bibliothèque de questions
        </CardTitle>
        <CardDescription>Questions réutilisables pour vos entretiens ({templates.length})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filter */}
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
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            <Input
              placeholder="Texte de la question..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs">Catégorie</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newFollowUp} onCheckedChange={setNewFollowUp} id="new-followup" />
                <Label htmlFor="new-followup" className="text-xs cursor-pointer">Relance IA</Label>
              </div>
              <Button size="sm" onClick={handleAdd} disabled={adding || !newContent.trim()}>
                {adding ? "Ajout..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {templates.length === 0 ? "Aucune question dans la bibliothèque." : "Aucun résultat."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-lg border p-3 flex items-start gap-2">
                {editingId === t.id ? (
                  <div className="flex-1 space-y-2">
                    <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                    <div className="flex gap-2 items-end flex-wrap">
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Aucune</SelectItem>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch checked={editFollowUp} onCheckedChange={setEditFollowUp} />
                        <Label className="text-xs">Relance</Label>
                      </div>
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{t.content}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {t.category && <Badge variant="secondary" className="text-xs">{t.category}</Badge>}
                        {t.follow_up_enabled && <Badge variant="outline" className="text-xs">Relance IA</Badge>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

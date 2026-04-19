import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, BookOpen } from "lucide-react";
import type { Question } from "./StepQuestions";

interface Template {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  follow_up_enabled: boolean;
  max_follow_ups: number;
  relance_level: string | null;
  type: string;
  audio_url: string | null;
  video_url: string | null;
}

interface QuestionLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (questions: Question[]) => void;
}

export function QuestionLibraryDialog({ open, onOpenChange, onSelect }: QuestionLibraryDialogProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    setSelected(new Set());
    setSearch("");
    setFilterCategory("all");
    setLoading(true);

    supabase.rpc("get_user_organization_id", { _user_id: user.id }).then(({ data: orgId }) => {
      if (!orgId) { setLoading(false); return; }
      supabase
        .from("question_templates")
        .select("id, title, content, category, follow_up_enabled, max_follow_ups, relance_level, type, audio_url, video_url")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setTemplates(data || []);
          setLoading(false);
        });
    });
  }, [open, user]);

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[];

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      t.content.toLowerCase().includes(q) ||
      (t.title || "").toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const questions: Question[] = templates
      .filter((t) => selected.has(t.id))
      .map((t) => ({
        title: t.title || t.content.slice(0, 60),
        content: t.content,
        category: t.category || "",
        type: "open",
        mediaType: (t.type === "audio" ? "audio" : t.type === "video" ? "video" : "written") as "written" | "audio" | "video",
        follow_up_enabled: t.follow_up_enabled,
        max_follow_ups: t.max_follow_ups,
        audioBlob: null,
        audioPreviewUrl: t.audio_url || null,
        videoBlob: null,
        videoPreviewUrl: t.video_url || null,
        from_library: true,
        save_to_library: false,
      }));
    onSelect(questions);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Bibliothèque de questions
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune question trouvée.</p>
          ) : (
            filtered.map((t) => (
              <label
                key={t.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selected.has(t.id) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  {t.title && <p className="text-sm font-semibold">{t.title}</p>}
                  <p className="text-sm text-muted-foreground">{t.content}</p>
                  <div className="flex gap-1 mt-1">
                    {t.category && <Badge variant="secondary" className="text-xs">{t.category}</Badge>}
                    {t.follow_up_enabled && <Badge variant="outline" className="text-xs">Relance IA</Badge>}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <p className="text-sm text-muted-foreground mr-auto">{selected.size} sélectionnée(s)</p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, ListChecks, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InterviewTemplatePayload {
  name: string;
  description: string;
  job_title: string;
  default_duration_minutes: number;
  default_language: "fr" | "en";
  questions: Array<{
    title: string;
    content: string;
    type: string;
    audio_url: string | null;
    video_url: string | null;
    category: string | null;
    follow_up_enabled: boolean;
    max_follow_ups: number;
    relance_level: "light" | "medium" | "deep";
  }>;
  criteria: Array<{
    label: string;
    description: string;
    weight: number;
    scoring_scale: string;
    applies_to: string;
    anchors: Record<string, string>;
  }>;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (tpl: InterviewTemplatePayload) => void;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  category: string | null;
  job_title: string;
  default_duration_minutes: number;
  default_language: "fr" | "en";
  questions_count?: number;
  criteria_count?: number;
}

export function InterviewTemplatePickerDialog({ open, onOpenChange, onApply }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
      if (!orgId) {
        setLoading(false);
        return;
      }
      const { data: tpls } = await supabase
        .from("interview_templates" as never)
        .select("*")
        .eq("organization_id", orgId as unknown as string)
        .order("name");
      const list = (tpls as unknown as TemplateRow[]) || [];
      if (list.length) {
        const ids = list.map((t) => t.id);
        const [{ data: qs }, { data: cs }] = await Promise.all([
          supabase.from("interview_template_questions" as never).select("template_id").in("template_id", ids),
          supabase.from("interview_template_criteria" as never).select("template_id").in("template_id", ids),
        ]);
        const qC: Record<string, number> = {};
        const cC: Record<string, number> = {};
        (qs as unknown as { template_id: string }[] || []).forEach((q) => {
          qC[q.template_id] = (qC[q.template_id] || 0) + 1;
        });
        (cs as unknown as { template_id: string }[] || []).forEach((c) => {
          cC[c.template_id] = (cC[c.template_id] || 0) + 1;
        });
        list.forEach((t) => {
          t.questions_count = qC[t.id] || 0;
          t.criteria_count = cC[t.id] || 0;
        });
      }
      setTemplates(list);
      setLoading(false);
    })();
  }, [open, user]);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleApply = async () => {
    if (!selectedId) return;
    const [{ data: qs }, { data: cs }, { data: tpl }] = await Promise.all([
      supabase
        .from("interview_template_questions" as never)
        .select("*")
        .eq("template_id", selectedId)
        .order("order_index"),
      supabase
        .from("interview_template_criteria" as never)
        .select("*")
        .eq("template_id", selectedId)
        .order("order_index"),
      supabase.from("interview_templates" as never).select("*").eq("id", selectedId).single(),
    ]);

    const t = tpl as unknown as TemplateRow;
    const payload: InterviewTemplatePayload = {
      name: t.name,
      description: t.description,
      job_title: t.job_title,
      default_duration_minutes: t.default_duration_minutes,
      default_language: t.default_language,
      questions: ((qs as unknown as Array<Record<string, unknown>>) || []).map((q) => ({
        title: (q.title as string) || "",
        content: (q.content as string) || "",
        type: (q.type as string) || "written",
        audio_url: (q.audio_url as string | null) || null,
        video_url: (q.video_url as string | null) || null,
        category: (q.category as string | null) || null,
        follow_up_enabled: q.follow_up_enabled as boolean,
        max_follow_ups: (q.max_follow_ups as number) ?? 2,
        relance_level: ((q.relance_level as string) || "medium") as "light" | "medium" | "deep",
      })),
      criteria: ((cs as unknown as Array<Record<string, unknown>>) || []).map((c) => ({
        label: (c.label as string) || "",
        description: (c.description as string) || "",
        weight: (c.weight as number) || 0,
        scoring_scale: (c.scoring_scale as string) || "0-5",
        applies_to: (c.applies_to as string) || "all_questions",
        anchors: ((c.anchors as Record<string, string>) || {}),
      })),
    };
    onApply(payload);
    onOpenChange(false);
    setSelectedId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choisir un entretien type</DialogTitle>
          <DialogDescription>
            Démarrer rapidement à partir d'un modèle. Vous pourrez tout modifier ensuite.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] pr-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Aucun modèle. Créez-en dans la bibliothèque.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50",
                    selectedId === t.id && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t.name}</span>
                        {t.category && <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>}
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                        <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{t.questions_count}</span>
                        <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{t.criteria_count}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{t.default_duration_minutes} min</span>
                      </div>
                    </div>
                    {selectedId === t.id && <Check className="h-5 w-5 text-primary shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleApply} disabled={!selectedId}>Utiliser ce modèle</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

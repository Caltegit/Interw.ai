import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, CopyPlus, Pencil, Trash2, ArrowUpDown, MoreHorizontal, SlidersHorizontal, ChevronDown, AlertTriangle, LayoutGrid, Rows3, Mail, Columns3, Share2 } from "lucide-react";
import { SessionCard } from "@/components/project/SessionCard";
import { BulkEmailDialog } from "@/components/project/BulkEmailDialog";
import { ShareReportsDialog } from "@/components/project/ShareReportsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SaveAsTemplateDialog } from "@/components/project/SaveAsTemplateDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { SessionVideoThumb } from "@/components/session/SessionVideoThumb";

function BulkActionsBar({
  count, onClear, onEmail, onDelete, onCompare, onShareReports, canShareReports,
}: { count: number; onClear: () => void; onEmail: () => void; onDelete: () => void; onCompare: () => void; onShareReports: () => void; canShareReports: boolean }) {
  const canCompare = count >= 2 && count <= 4;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="default">
            Actions <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onEmail}>
            <Mail className="mr-2 h-4 w-4" /> Envoyer un email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShareReports} disabled={!canShareReports}>
            <Share2 className="mr-2 h-4 w-4" />
            Partager les rapports
            {!canShareReports && (
              <span className="ml-2 text-xs text-muted-foreground">Aucun rapport</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onCompare}
            disabled={!canCompare}
          >
            <Columns3 className="mr-2 h-4 w-4" />
            Comparer
            {!canCompare && (
              <span className="ml-2 text-xs text-muted-foreground">
                {count > 4 ? "Maximum 4" : "Min. 2"}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="ghost" onClick={onClear}>Tout désélectionner</Button>
      <span className="ml-auto text-sm font-medium">{count} candidat(s) sélectionné(s)</span>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reportsBySession, setReportsBySession] = useState<Record<string, any>>({});
  
  const [orgMembers, setOrgMembers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  // Sélection multiple (vue tableau uniquement)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [shareReportsOpen, setShareReportsOpen] = useState(false);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<0 | 1 | 2>(0);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const toggleSelect = (sid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Filters / sort for sessions list
  const [search, setSearch] = useState("");
  // statusFilter retiré : la liste n'affiche que les sessions prêtes (rapport généré)
  const [recoFilter, setRecoFilter] = useState<string>("all");
  const [scoreMin, setScoreMin] = useState<string>("");
  const [scoreMax, setScoreMax] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<"date" | "score" | "name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // "all" | "me" | userId
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "cards">(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem(`projectView:${id}`) as "table" | "cards") || "cards";
  });
  useEffect(() => {
    if (id) localStorage.setItem(`projectView:${id}`, view);
  }, [view, id]);

  // Recruiter notes inline edit
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});

  // Pagination des sessions filtrées
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Visibilité des sélections (chips au-dessus des sessions)
  const DECISION_KEYS = ["none", "shortlisted", "second_opinion", "rejected"] as const;
  const DEFAULT_VISIBLE_DECISIONS = ["none", "shortlisted", "second_opinion", "rejected"];
  const [visibleDecisions, setVisibleDecisions] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE_DECISIONS);
    try {
      const raw = localStorage.getItem(`projectDecisionVisibility:${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
      }
    } catch {
      /* ignore */
    }
    return new Set(DEFAULT_VISIBLE_DECISIONS);
  });
  useEffect(() => {
    if (id) localStorage.setItem(`projectDecisionVisibility:${id}`, JSON.stringify([...visibleDecisions]));
  }, [visibleDecisions, id]);
  const toggleDecision = (key: string) => {
    setVisibleDecisions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPage(0);
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadSessionsAndReports = async () => {
      const { data: sList } = await supabase
        .from("sessions")
        .select("id, candidate_name, candidate_email, status, token, created_at, project_id, assigned_to, recruiter_decision, recruiter_note, video_recording_url, thumbnail_url")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const sessionsList = sList ?? [];
      setSessions(sessionsList);

      const ids = sessionsList.map((s) => s.id);
      if (ids.length === 0) {
        setReportsBySession({});
        return;
      }

      const { data: reps } = await supabase
        .from("reports")
        .select("id, session_id, overall_score, recommendation")
        .in("session_id", ids);
      if (cancelled) return;

      const map: Record<string, any> = {};
      const drafts: Record<string, string> = {};
      for (const r of reps ?? []) {
        map[r.session_id] = r;
      }
      for (const s of sessionsList) {
        drafts[s.id] = (s as any).recruiter_note ?? "";
      }
      setReportsBySession(map);
      setNoteDrafts((prev) => ({ ...drafts, ...prev }));
    };

    Promise.all([
      supabase
        .from("projects")
        .select(
          "id, title, description, slug, status, language, ai_persona_name, ai_voice, max_duration_minutes, record_audio, record_video, organization_id, created_by, job_title, avatar_image_url, intro_audio_url",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("questions")
        .select("id, project_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, audio_url, video_url, hint_text, relance_level, max_response_seconds, scoring_criteria_ids")
        .eq("project_id", id)
        .is("archived_at", null)
        .order("order_index"),
      supabase
        .from("evaluation_criteria")
        .select("id, project_id, order_index, label, description, weight, scoring_scale, anchors, applies_to")
        .eq("project_id", id)
        .order("order_index"),
    ]).then(async ([pRes, qRes, cRes]) => {
      if (cancelled) return;
      setProject(pRes.data);
      setQuestions(qRes.data ?? []);
      setCriteria(cRes.data ?? []);

      if (pRes.data?.organization_id) {
        const { data: members } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("organization_id", pRes.data.organization_id);
        if (!cancelled) setOrgMembers(members ?? []);
      }

      await loadSessionsAndReports();
      if (!cancelled) setLoading(false);
    });

    // Rafraîchissement périodique pour faire apparaître les nouvelles sessions prêtes
    const interval = setInterval(loadSessionsAndReports, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  const memberById = (uid?: string | null) => orgMembers.find((m) => m.user_id === uid);
  const memberLabel = (uid?: string | null) => {
    const m = memberById(uid);
    if (!m) return "—";
    return m.full_name || m.email;
  };

  const reassignSession = async (sessionId: string, newAssignee: string | null) => {
    const { error } = await supabase
      .from("sessions")
      .update({ assigned_to: newAssignee })
      .eq("id", sessionId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, assigned_to: newAssignee } : s)));
    toast({ title: "Session réassignée." });
  };

  const updateDecision = async (sessionId: string, decision: string) => {
    const patch: any = {
      recruiter_decision: decision,
      recruiter_decision_at: decision === "none" ? null : new Date().toISOString(),
      recruiter_decision_by: decision === "none" ? null : user?.id ?? null,
    };
    const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, recruiter_decision: decision } : s)));
  };

  const saveNote = (sessionId: string, value: string) => {
    setNoteDrafts((prev) => ({ ...prev, [sessionId]: value }));
    if (noteTimers.current[sessionId]) clearTimeout(noteTimers.current[sessionId]);
    noteTimers.current[sessionId] = setTimeout(async () => {
      setSavingNote((p) => ({ ...p, [sessionId]: true }));
      const { error } = await supabase
        .from("sessions")
        .update({ recruiter_note: value })
        .eq("id", sessionId);
      setSavingNote((p) => ({ ...p, [sessionId]: false }));
      if (error) {
        toast({ title: "Erreur", description: "Note non sauvegardée", variant: "destructive" });
      }
    }, 1000);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const results = await Promise.allSettled(
      ids.map((sid) =>
        supabase.functions.invoke("delete-session", { body: { session_id: sid } }),
      ),
    );
    const okIds = ids.filter((_, i) => {
      const r = results[i];
      if (r.status !== "fulfilled") return false;
      const v: any = r.value;
      return !(v?.error || v?.data?.error);
    });
    setSessions((prev) => prev.filter((s) => !okIds.includes(s.id)));
    setSelectedIds(new Set());
    setBulkDeleteStep(0);
    setBulkDeleting(false);
    const failed = ids.length - okIds.length;
    if (failed === 0) {
      toast({ title: `${okIds.length} session(s) supprimée(s)` });
    } else {
      toast({
        title: `Suppression partielle : ${okIds.length} ok, ${failed} échec(s)`,
        variant: "destructive",
      });
    }
  };

  const copyProjectLink = () => {
    if (!project?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/session/${project.slug}`);
    toast({ title: "Lien copié !" });
  };

  const copyCandidateLink = (token: string) => {
    if (!project?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/session/${project.slug}/start/${token}`);
    toast({ title: "Lien de relance copié !" });
  };

  const handleDuplicate = async () => {
    if (!project || !user) return;
    setDuplicating(true);
    try {
      const slug =
        project.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-copy-" +
        Date.now().toString(36);

      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          organization_id: project.organization_id,
          created_by: user.id,
          title: `${project.title} (copie)`,
          job_title: project.job_title,
          description: project.description,
          language: project.language,
          ai_persona_name: project.ai_persona_name,
          ai_voice: project.ai_voice,
          max_duration_minutes: project.max_duration_minutes,
          record_audio: project.record_audio,
          record_video: project.record_video,
          status: "draft" as never,
          slug,
          avatar_image_url: project.avatar_image_url,
          intro_audio_url: project.intro_audio_url,
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicate questions (réindexation propre + recopie complète des champs)
      if (questions.length > 0) {
        await supabase.from("questions").insert(
          questions.map((q, idx) => ({
            project_id: newProject.id,
            order_index: idx,
            title: (q as any).title || q.content.slice(0, 60),
            content: q.content,
            type: q.type,
            follow_up_enabled: q.follow_up_enabled,
            max_follow_ups: q.max_follow_ups,
            audio_url: (q as any).audio_url ?? null,
            video_url: (q as any).video_url ?? null,
            hint_text: (q as any).hint_text ?? null,
            relance_level: (q as any).relance_level ?? "medium",
            max_response_seconds: (q as any).max_response_seconds ?? null,
            scoring_criteria_ids: (q as any).scoring_criteria_ids ?? null,
          })),
        );
      }

      // Duplicate criteria
      if (criteria.length > 0) {
        await supabase.from("evaluation_criteria").insert(
          criteria.map((c) => ({
            project_id: newProject.id,
            order_index: c.order_index,
            label: c.label,
            description: c.description,
            weight: c.weight,
            scoring_scale: c.scoring_scale,
            anchors: c.anchors,
            applies_to: c.applies_to,
          })),
        );
      }

      toast({ title: "Projet dupliqué !", description: "Le nouveau projet a été créé en brouillon." });
      navigate(`/projects/${newProject.id}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("projects").delete().eq("id", id!);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le projet.", variant: "destructive" });
    } else {
      toast({ title: "Projet supprimé" });
      navigate("/projects");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  if (!project) return <p>Projet introuvable</p>;

  const statusLabel =
    { draft: "Brouillon", active: "Actif", archived: "Archivé" }[project.status as string] ?? project.status;
  const isReady = (s: any) =>
    s.status === "completed" && !!reportsBySession[s.id];
  const readySessions = sessions.filter(isReady);
  const visibleSessions = sessions.filter((s) => s.status !== "cancelled");
  const completedSessions = readySessions;
  const processingCount = sessions.filter(
    (s) => s.status === "completed" && !reportsBySession[s.id],
  ).length;

  const effectiveSort = { key: sortKey, dir: sortDir };

  // Apply filters + sort to sessions (uniquement les sessions prêtes)
  const filteredSessions = (() => {
    let list = readySessions.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.candidate_name || "").toLowerCase().includes(q) ||
          (s.candidate_email || "").toLowerCase().includes(q),
      );
    }
    if (assigneeFilter === "me") list = list.filter((s) => s.assigned_to === user?.id);
    else if (assigneeFilter !== "all") list = list.filter((s) => s.assigned_to === assigneeFilter);
    if (decisionFilter !== "all")
      list = list.filter((s) => (s.recruiter_decision ?? "none") === decisionFilter);
    if (visibleDecisions.size > 0) {
      list = list.filter((s) => visibleDecisions.has(s.recruiter_decision ?? "none"));
    }
    if (recoFilter !== "all")
      list = list.filter((s) => reportsBySession[s.id]?.recommendation === recoFilter);
    if (scoreMin !== "")
      list = list.filter((s) => (reportsBySession[s.id]?.overall_score ?? -1) >= Number(scoreMin));
    if (scoreMax !== "")
      list = list.filter((s) => (reportsBySession[s.id]?.overall_score ?? 999) <= Number(scoreMax));
    if (dateFrom) list = list.filter((s) => new Date(s.created_at) >= new Date(dateFrom));
    if (dateTo) list = list.filter((s) => new Date(s.created_at) <= new Date(dateTo + "T23:59:59"));

    list.sort((a, b) => {
      let cmp = 0;
      if (effectiveSort.key === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (effectiveSort.key === "name") cmp = (a.candidate_name || "").localeCompare(b.candidate_name || "");
      else if (effectiveSort.key === "score")
        cmp = (reportsBySession[a.id]?.overall_score ?? -1) - (reportsBySession[b.id]?.overall_score ?? -1);
      return effectiveSort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  })();

  // Badge d'ancienneté pour les sessions en attente
  const getPendingAge = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 1) return { label: "aujourd'hui", className: "bg-success/10 text-success border-success/30" };
    if (days < 3) return { label: `${days}j`, className: "bg-success/10 text-success border-success/30" };
    if (days <= 7) return { label: `${days}j`, className: "bg-warning/10 text-warning border-warning/30" };
    return { label: `${days}j`, className: "bg-destructive/10 text-destructive border-destructive/30" };
  };

  const totalSessionsPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const pagedSessions = filteredSessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const recoLabel: Record<string, string> = {
    strong_yes: "Très favorable",
    yes: "Favorable",
    maybe: "Mitigé",
  };

  const decisionOptions: { value: string; label: string; dot: string; text: string }[] = [
    { value: "none", label: "À traiter", dot: "bg-muted-foreground/40", text: "" },
    { value: "shortlisted", label: "Retenu", dot: "bg-success", text: "text-success" },
    { value: "second_opinion", label: "À discuter", dot: "bg-warning", text: "text-warning" },
    { value: "rejected", label: "Non", dot: "bg-destructive", text: "text-destructive" },
  ];
  const decisionByValue = Object.fromEntries(decisionOptions.map((d) => [d.value, d]));

  const activeFilterCount =
    (recoFilter !== "all" ? 1 : 0) +
    (scoreMin !== "" ? 1 : 0) +
    (scoreMax !== "" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (assigneeFilter !== "all" ? 1 : 0) +
    (decisionFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setRecoFilter("all");
    setScoreMin("");
    setScoreMax("");
    setDateFrom("");
    setDateTo("");
    setAssigneeFilter("all");
    setDecisionFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* En-tête condensé */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold truncate">{project.title}</h1>
          <Badge variant={project.status === "active" ? "default" : "secondary"}>{statusLabel}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={copyProjectLink}>
            <Copy className="mr-1 h-4 w-4" /> <span className="sr-only sm:not-sr-only">Lien candidat</span>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${project.id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" /> <span className="sr-only sm:not-sr-only">Modifier</span>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate} disabled={duplicating}>
                <CopyPlus className="mr-2 h-4 w-4" /> {duplicating ? "Duplication…" : "Dupliquer"}
              </DropdownMenuItem>
              <SaveAsTemplateDialog
                projectId={project.id}
                defaultName={project.title}
                defaultJobTitle={project.job_title}
                defaultDuration={project.max_duration_minutes}
                defaultLanguage={project.language}
              />
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes les sessions et données associées seront supprimées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filtres rapides Sélection */}
      {visibleSessions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {decisionOptions.map((d) => {
            const count = readySessions.filter((s) => (s.recruiter_decision ?? "none") === d.value).length;
            const active = visibleDecisions.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDecision(d.value)}
                className={`flex items-center gap-3 rounded-full border px-5 py-2.5 text-base transition-colors ${
                  active
                    ? "bg-muted border-foreground/20"
                    : "bg-transparent border-transparent text-muted-foreground opacity-60 hover:opacity-100"
                }`}
                aria-pressed={active}
              >
                <span className={`inline-block h-3 w-3 rounded-full ${d.dot}`} />
                <span className={active ? d.text : ""}>{d.label}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="sessions">
        <TabsList className="hidden">
          <TabsTrigger value="sessions">Sessions ({visibleSessions.length})</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="criteria">Critères ({criteria.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {visibleSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune session — les candidats apparaîtront ici quand ils utiliseront le lien.
            </p>
          ) : (
            <>
              {/* Barre filtres compacte */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-md border">
                  <Button
                    variant={view === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-9 rounded-r-none"
                    onClick={() => setView("table")}
                    title="Vue tableau"
                  >
                    <Rows3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === "cards" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-9 rounded-l-none"
                    onClick={() => setView("cards")}
                    title="Vue cartes"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredSessions.length} / {visibleSessions.length}
                </span>
                <Input
                  placeholder="Rechercher (nom ou email)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ml-auto max-w-xs h-9"
                />
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="h-9 w-auto min-w-[10rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sessions</SelectItem>
                    <SelectItem value="me">Mes sessions</SelectItem>
                    {orgMembers
                      .filter((m) => m.user_id !== user?.id)
                      .map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={`${sortKey}-${sortDir}`} onValueChange={(v) => {
                  const [k, d] = v.split("-") as [typeof sortKey, typeof sortDir];
                  setSortKey(k); setSortDir(d);
                }}>
                  <SelectTrigger className="w-auto h-9 gap-1">
                    <ArrowUpDown className="h-3 w-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (récent)</SelectItem>
                    <SelectItem value="date-asc">Date (ancien)</SelectItem>
                    <SelectItem value="score-desc">Score (haut)</SelectItem>
                    <SelectItem value="score-asc">Score (bas)</SelectItem>
                    <SelectItem value="name-asc">Nom (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Nom (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {view === "cards" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedSessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      report={reportsBySession[s.id]}
                      questions={questions}
                      onDecisionChange={updateDecision}
                    />
                  ))}
                  {pagedSessions.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">
                      Aucun candidat ne correspond aux filtres.
                    </p>
                  )}
                </div>
              ) : (
              <div className="space-y-2">
                {selectedIds.size > 0 && (
                  <BulkActionsBar
                    count={selectedIds.size}
                    onClear={clearSelection}
                    onEmail={() => setBulkEmailOpen(true)}
                    onDelete={() => setBulkDeleteStep(1)}
                    onCompare={() => navigate(`/projects/${id}/compare?ids=${[...selectedIds].slice(0, 4).join(",")}`)}
                    onShareReports={() => setShareReportsOpen(true)}
                    canShareReports={[...selectedIds].some((sid) => !!reportsBySession[sid]?.id)}
                  />
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 w-8">
                          <Checkbox
                            checked={
                              pagedSessions.length > 0 &&
                              pagedSessions.every((s) => selectedIds.has(s.id))
                                ? true
                                : pagedSessions.some((s) => selectedIds.has(s.id))
                                ? "indeterminate"
                                : false
                            }
                            onCheckedChange={(v) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (v) pagedSessions.forEach((s) => next.add(s.id));
                                else pagedSessions.forEach((s) => next.delete(s.id));
                                return next;
                              });
                            }}
                            aria-label="Tout sélectionner"
                          />
                        </th>
                        <th className="pb-2 font-medium max-w-[14rem]">Candidat</th>
                        <th className="pb-2 pr-6 font-medium w-[7rem]">Sélection</th>
                        <th className="pb-2 pl-2 font-medium">Score</th>
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium hidden md:table-cell">Assignée à</th>
                        <th className="pb-2 font-medium min-w-[200px] hidden lg:table-cell">Note recruteur</th>
                        <th className="pb-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSessions.map((s) => {
                        const rep = reportsBySession[s.id];
                        const clickable = s.status === "completed";
                        const onRowClick = () => clickable && navigate(`/sessions/${s.id}`);
                        return (
                          <tr
                            key={s.id}
                            className={`border-b last:border-0 ${clickable ? "cursor-pointer hover:bg-muted/40" : ""}`}
                            onClick={onRowClick}
                          >
                            <td className="py-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(s.id)}
                                onCheckedChange={() => toggleSelect(s.id)}
                                aria-label="Sélectionner"
                              />
                            </td>
                            <td className="py-3 max-w-[14rem]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <SessionVideoThumb thumbnailUrl={(s as any).thumbnail_url} videoUrl={(s as any).video_recording_url} name={s.candidate_name} />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{s.candidate_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.candidate_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-6" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const current = (s.recruiter_decision ?? "none") as string;
                              const meta = decisionByValue[current] ?? decisionByValue.none;
                              return (
                                <Select value={current} onValueChange={(v) => updateDecision(s.id, v)}>
                                  <SelectTrigger className={`h-8 w-[7rem] text-xs ${meta.text}`}>
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <span className={`inline-block h-2 w-2 rounded-full border shrink-0 ${meta.dot}`} />
                                      <span className="truncate">{meta.label}</span>
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {decisionOptions.map((d) => (
                                      <SelectItem key={d.value} value={d.value}>
                                        <span className="flex items-center gap-2">
                                          <span className={`inline-block h-2 w-2 rounded-full border ${d.dot}`} />
                                          {d.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            })()}
                          </td>
                          <td className="py-3 pl-2 font-medium">
                            {rep?.overall_score != null ? rep.overall_score.toFixed(1) : "—"}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span>
                                {(() => {
                                  const days = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
                                  if (days === 0) return "Aujourd'hui";
                                  if (days === 1) return "Hier";
                                  return `Il y a ${days} jours`;
                                })()}
                              </span>
                              {s.status === "pending" && (() => {
                                const age = getPendingAge(s.created_at);
                                return (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${age.className}`}>
                                    {age.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-3 hidden md:table-cell text-xs" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={s.assigned_to ?? "none"}
                              onValueChange={(v) => reassignSession(s.id, v === "none" ? null : v)}
                            >
                              <SelectTrigger className="h-8 w-full max-w-[9rem] text-xs">
                                <SelectValue placeholder="—">{memberLabel(s.assigned_to)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Non assignée</SelectItem>
                                {orgMembers.map((m) => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.full_name || m.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                            {rep ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={noteDrafts[s.id] ?? ""}
                                  onChange={(e) => saveNote(s.id, e.target.value)}
                                  placeholder="Ajouter une note…"
                                  className="h-8 text-xs"
                                />
                                {savingNote[s.id] && (
                                  <span className="text-xs text-muted-foreground">…</span>
                                )}
                              </div>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input disabled placeholder="Pas de rapport" className="h-8 text-xs" />
                                </TooltipTrigger>
                                <TooltipContent>Note disponible une fois le rapport généré</TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                          <td className="py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              {s.status === "pending" && (
                                <Button variant="ghost" size="sm" onClick={() => copyCandidateLink(s.token)}>
                                  <Copy className="mr-1 h-3 w-3" /> Relancer
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Envoyer un email"
                                onClick={() => {
                                  setSelectedIds(new Set([s.id]));
                                  setBulkEmailOpen(true);
                                }}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              {false && (<AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action supprimera la session de {s.candidate_name}, y compris la transcription,
                                      les messages et le rapport. Irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={async () => {
                                        const { data, error } = await supabase.functions.invoke(
                                          "delete-session",
                                          { body: { session_id: s.id } },
                                        );
                                        if (error || (data as any)?.error) {
                                          toast({
                                            title: "Suppression impossible",
                                            description:
                                              (data as any)?.error || error?.message || "Erreur inconnue",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        setSessions((prev) => prev.filter((ss) => ss.id !== s.id));
                                        toast({ title: "Session supprimée" });
                                      }}
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                {selectedIds.size > 0 && (
                  <BulkActionsBar
                    count={selectedIds.size}
                    onClear={clearSelection}
                    onEmail={() => setBulkEmailOpen(true)}
                    onDelete={() => setBulkDeleteStep(1)}
                    onCompare={() => navigate(`/projects/${id}/compare?ids=${[...selectedIds].slice(0, 4).join(",")}`)}
                    onShareReports={() => setShareReportsOpen(true)}
                    canShareReports={[...selectedIds].some((sid) => !!reportsBySession[sid]?.id)}
                  />
                )}
              </div>
              )}

              {filteredSessions.length > PAGE_SIZE && (
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="text-muted-foreground">
                    Page {page + 1} / {totalSessionsPages}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                      Précédent
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalSessionsPages - 1, p + 1))} disabled={page + 1 >= totalSessionsPages}>
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="questions">
          <div className="space-y-2">
            {questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="py-3 flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    {(q as any).title && <p className="text-sm font-medium">{(q as any).title}</p>}
                    <p className="text-sm text-muted-foreground">{q.content}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {q.type} {q.follow_up_enabled && "• Relances activées"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="criteria">
          <div className="space-y-2">
            {criteria.map((c) => (
              <Card key={c.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{c.weight}%</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{c.scoring_scale}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <BulkEmailDialog
        open={bulkEmailOpen}
        onOpenChange={setBulkEmailOpen}
        recipients={sessions.filter((s) => selectedIds.has(s.id)).map((s) => ({
          id: s.id,
          candidate_name: s.candidate_name,
          candidate_email: s.candidate_email,
        }))}
        projectTitle={project?.title ?? ""}
        onSent={clearSelection}
      />

      <ShareReportsDialog
        open={shareReportsOpen}
        onOpenChange={setShareReportsOpen}
        projectTitle={project?.title ?? ""}
        recipients={sessions
          .filter((s) => selectedIds.has(s.id) && reportsBySession[s.id]?.id)
          .map((s) => ({
            sessionId: s.id,
            name: s.candidate_name ?? "Candidat",
            score: reportsBySession[s.id]?.overall_score ?? null,
            reportId: reportsBySession[s.id].id,
          }))}
        skippedCount={[...selectedIds].filter((sid) => !reportsBySession[sid]?.id).length}
      />

      <AlertDialog open={bulkDeleteStep === 1} onOpenChange={(o) => !o && setBulkDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedIds.size} candidat(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les sessions, transcriptions, messages et rapports associés seront supprimés. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => setBulkDeleteStep(2)}>Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteStep === 2} onOpenChange={(o) => !o && setBulkDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Dernière confirmation avant suppression de {selectedIds.size} candidat(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

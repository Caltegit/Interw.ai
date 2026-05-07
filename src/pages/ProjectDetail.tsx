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
import { Copy, CopyPlus, Pencil, Trash2, BarChart3, ArrowUpDown, MoreHorizontal, SlidersHorizontal, ChevronDown, AlertTriangle } from "lucide-react";
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

  // Filters / sort for sessions list
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Recruiter notes inline edit
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});

  // Pagination des sessions filtrées
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!id) return;
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
      supabase
        .from("sessions")
        .select("id, candidate_name, candidate_email, status, token, created_at, project_id, assigned_to, recruiter_decision")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
    ]).then(async ([pRes, qRes, cRes, sRes]) => {
      setProject(pRes.data);
      setQuestions(qRes.data ?? []);
      setCriteria(cRes.data ?? []);
      const sessionsList = sRes.data ?? [];
      setSessions(sessionsList);

      // Load org members for the "assigned to" selector
      if (pRes.data?.organization_id) {
        const { data: members } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("organization_id", pRes.data.organization_id);
        setOrgMembers(members ?? []);
      }

      // Fetch reports for these sessions in one batch
      const ids = sessionsList.map((s) => s.id);
      if (ids.length > 0) {
        const { data: reps } = await supabase
          .from("reports")
          .select("session_id, overall_score, recommendation, recruiter_notes")
          .in("session_id", ids);
        const map: Record<string, any> = {};
        const drafts: Record<string, string> = {};
        for (const r of reps ?? []) {
          map[r.session_id] = r;
          drafts[r.session_id] = r.recruiter_notes ?? "";
        }
        setReportsBySession(map);
        setNoteDrafts(drafts);
      }
      setLoading(false);
    });
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
        .from("reports")
        .update({ recruiter_notes: value })
        .eq("session_id", sessionId);
      setSavingNote((p) => ({ ...p, [sessionId]: false }));
      if (error) {
        toast({ title: "Erreur", description: "Note non sauvegardée", variant: "destructive" });
      }
    }, 1000);
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
  const pendingSessions = sessions.filter((s) => s.status === "pending");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress");
  const toReviewSessions = sessions.filter(
    (s) =>
      s.status === "completed" &&
      (!reportsBySession[s.id] || s.recruiter_decision === "none"),
  );

  // Tri par défaut adapté : si l'utilisateur n'a rien changé et qu'on filtre les "en attente", on trie par date ancienne en premier
  const effectiveSort = (() => {
    if (sortKey !== "date" || sortDir !== "desc") return { key: sortKey, dir: sortDir };
    if (statusFilter === "pending") return { key: "date" as const, dir: "asc" as const };
    return { key: sortKey, dir: sortDir };
  })();

  // Apply filters + sort to sessions
  const filteredSessions = (() => {
    let list = sessions.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.candidate_name || "").toLowerCase().includes(q) ||
          (s.candidate_email || "").toLowerCase().includes(q),
      );
    }
    if (statusFilter === "to_review") {
      list = list.filter(
        (s) =>
          s.status === "completed" &&
          (!reportsBySession[s.id] || s.recruiter_decision === "none"),
      );
    } else if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (assigneeFilter === "me") list = list.filter((s) => s.assigned_to === user?.id);
    else if (assigneeFilter !== "all") list = list.filter((s) => s.assigned_to === assigneeFilter);
    if (decisionFilter !== "all")
      list = list.filter((s) => (s.recruiter_decision ?? "none") === decisionFilter);
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
    no: "Défavorable",
  };

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (recoFilter !== "all" ? 1 : 0) +
    (scoreMin !== "" ? 1 : 0) +
    (scoreMax !== "" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (assigneeFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter("all");
    setRecoFilter("all");
    setScoreMin("");
    setScoreMax("");
    setDateFrom("");
    setDateTo("");
    setAssigneeFilter("all");
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
              {completedSessions.length >= 2 && (
                <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/compare`)}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Comparer les candidats
                </DropdownMenuItem>
              )}
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

      {/* Détails du projet (replié par défaut) */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2">
            <ChevronDown className="h-4 w-4 mr-1" />
            Détails du projet
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <p><strong>Description :</strong> {project.description || "—"}</p>
              <p><strong>Langue :</strong> {project.language === "fr" ? "Français" : "English"}</p>
              <p><strong>Persona IA :</strong> {project.ai_persona_name}</p>
              <p><strong>Durée max :</strong> {project.max_duration_minutes} min</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="criteria">Critères ({criteria.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {/* Onglets de statut visibles */}
          {sessions.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b pb-2">
              {[
                { key: "all", label: "Toutes", count: sessions.length, tone: "" },
                { key: "pending", label: "En attente", count: pendingSessions.length, tone: "text-warning" },
                { key: "in_progress", label: "En cours", count: inProgressSessions.length, tone: "" },
                { key: "completed", label: "Terminées", count: completedSessions.length, tone: "" },
                { key: "to_review", label: "À traiter", count: toReviewSessions.length, tone: "text-primary" },
              ].map((t) => {
                const active = statusFilter === t.key;
                return (
                  <Button
                    key={t.key}
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { setStatusFilter(t.key); setPage(0); }}
                    className="h-8"
                  >
                    {t.label}
                    <span className={`ml-1.5 text-xs ${active ? "opacity-80" : t.tone || "text-muted-foreground"}`}>
                      {t.count}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune session — les candidats apparaîtront ici quand ils utiliseront le lien.
            </p>
          ) : (
            <>
              {/* Barre filtres compacte */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Rechercher (nom ou email)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs h-9"
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-1" />
                      Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Recommandation</Label>
                      <Select value={recoFilter} onValueChange={setRecoFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="strong_yes">Très favorable</SelectItem>
                          <SelectItem value="yes">Favorable</SelectItem>
                          <SelectItem value="maybe">Mitigé</SelectItem>
                          <SelectItem value="no">Défavorable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Score min</Label>
                        <Input type="number" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Score max</Label>
                        <Input type="number" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Du</Label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Au</Label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full">
                      Réinitialiser
                    </Button>
                  </PopoverContent>
                </Popover>
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
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredSessions.length} / {sessions.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Candidat</th>
                      <th className="pb-2 font-medium">Statut</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium">Reco</th>
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
                          <td className="py-3">
                            <p className="font-medium">{s.candidate_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.candidate_email}</p>
                          </td>
                          <td className="py-3">
                            <SessionStatusBadge status={s.status} />
                          </td>
                          <td className="py-3 font-medium">
                            {rep?.overall_score != null ? rep.overall_score.toFixed(1) : "—"}
                          </td>
                          <td className="py-3 text-xs">
                            {rep?.recommendation ? recoLabel[rep.recommendation] ?? rep.recommendation : "—"}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span>{new Date(s.created_at).toLocaleDateString("fr-FR")}</span>
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
                              <SelectTrigger className="h-8 w-full max-w-[12rem] text-xs">
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
                              <AlertDialog>
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
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
    </div>
  );
}

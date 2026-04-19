import { useEffect, useMemo, useRef, useState } from "react";
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
import { Copy, CopyPlus, Pencil, Trash2, Send, BarChart3, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Recruiter notes inline edit
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("questions").select("*").eq("project_id", id).order("order_index"),
      supabase.from("evaluation_criteria").select("*").eq("project_id", id).order("order_index"),
      supabase.from("sessions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    ]).then(async ([pRes, qRes, cRes, sRes]) => {
      setProject(pRes.data);
      setQuestions(qRes.data ?? []);
      setCriteria(cRes.data ?? []);
      const sessionsList = sRes.data ?? [];
      setSessions(sessionsList);

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
    navigator.clipboard.writeText(`${window.location.origin}/interview/${project.slug}`);
    toast({ title: "Lien copié !" });
  };

  const copyCandidateLink = (token: string) => {
    if (!project?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/interview/${project.slug}/start/${token}`);
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

      // Duplicate questions
      if (questions.length > 0) {
        await supabase.from("questions").insert(
          questions.map((q) => ({
            project_id: newProject.id,
            order_index: q.order_index,
            title: (q as any).title || q.content.slice(0, 60),
            content: q.content,
            type: q.type,
            follow_up_enabled: q.follow_up_enabled,
            max_follow_ups: q.max_follow_ups,
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
    if (statusFilter !== "all") list = list.filter((s) => s.status === statusFilter);
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
      if (sortKey === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortKey === "name") cmp = (a.candidate_name || "").localeCompare(b.candidate_name || "");
      else if (sortKey === "score")
        cmp = (reportsBySession[a.id]?.overall_score ?? -1) - (reportsBySession[b.id]?.overall_score ?? -1);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  })();

  const recoLabel: Record<string, string> = {
    strong_yes: "Très favorable",
    yes: "Favorable",
    maybe: "Mitigé",
    no: "Défavorable",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground">{project.job_title}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={project.status === "active" ? "default" : "secondary"}>{statusLabel}</Badge>
            <Button variant="outline" size="sm" onClick={copyProjectLink}>
              <Copy className="mr-1 h-4 w-4" /> Lien candidat
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
              <CopyPlus className="mr-1 h-4 w-4" /> {duplicating ? "Duplication..." : "Dupliquer"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {completedSessions.length >= 2 && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/projects/${project.id}/compare`}>
                  <BarChart3 className="mr-1 h-4 w-4" /> Comparer les candidats
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/projects/${project.id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" /> Modifier
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
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
          </div>
        </div>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="criteria">Critères ({criteria.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <p>
                <strong>Description :</strong> {project.description || "—"}
              </p>
              <p>
                <strong>Langue :</strong> {project.language === "fr" ? "Français" : "English"}
              </p>
              <p>
                <strong>Persona IA :</strong> {project.ai_persona_name}
              </p>
              <p>
                <strong>Durée max :</strong> {project.max_duration_minutes} min
              </p>
              <p>
                <strong>Lien :</strong>{" "}
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {window.location.origin}/interview/{project.slug}
                </code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {/* Pending sessions alert */}
          {pendingSessions.length > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="h-4 w-4 text-warning" />
                  {pendingSessions.length} candidat(s) en attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Ces candidats n'ont pas encore commencé leur entretien. Copiez leur lien pour les relancer.
                </p>
                <div className="space-y-2">
                  {pendingSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.candidate_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.candidate_email}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>depuis {Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000)}j</span>
                        <Button variant="outline" size="sm" onClick={() => copyCandidateLink(s.token)}>
                          <Copy className="mr-1 h-3 w-3" /> Relancer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune session — les candidats apparaîtront ici quand ils utiliseront le lien.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Candidat</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3">{s.candidate_name}</td>
                      <td className="py-3">{s.candidate_email}</td>
                      <td className="py-3">
                        <SessionStatusBadge status={s.status} />
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 flex gap-1">
                        {s.status === "completed" && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/sessions/${s.id}`}>Voir</Link>
                          </Button>
                        )}
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
                              <AlertDialogTitle>Supprimer cet entretien ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera l'entretien de {s.candidate_name}, y compris la transcription,
                                le rapport et les vidéos associées. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  // Delete related data then session
                                  // Get report ids first for report_shares cleanup
                                  const { data: reports } = await supabase
                                    .from("reports")
                                    .select("id")
                                    .eq("session_id", s.id);
                                  if (reports && reports.length > 0) {
                                    await supabase
                                      .from("report_shares")
                                      .delete()
                                      .in(
                                        "report_id",
                                        reports.map((r) => r.id),
                                      );
                                  }
                                  await supabase.from("session_messages").delete().eq("session_id", s.id);
                                  await supabase.from("reports").delete().eq("session_id", s.id);
                                  await supabase.from("transcripts").delete().eq("session_id", s.id);
                                  await supabase.from("sessions").delete().eq("id", s.id);
                                  setSessions((prev) => prev.filter((ss) => ss.id !== s.id));
                                  toast({ title: "Entretien supprimé" });
                                }}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

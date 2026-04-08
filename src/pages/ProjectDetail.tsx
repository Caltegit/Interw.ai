import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import { Copy, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("questions").select("*").eq("project_id", id).order("order_index"),
      supabase.from("evaluation_criteria").select("*").eq("project_id", id).order("order_index"),
      supabase.from("sessions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    ]).then(([pRes, qRes, cRes, sRes]) => {
      setProject(pRes.data);
      setQuestions(qRes.data ?? []);
      setCriteria(cRes.data ?? []);
      setSessions(sRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const copySessionLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/interview/${token}`);
    toast({ title: "Lien copié !" });
  };

  const inviteCandidate = async () => {
    if (!candidateName.trim() || !candidateEmail.trim()) return;
    setInviting(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({ project_id: id!, candidate_name: candidateName, candidate_email: candidateEmail })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSessions((prev) => [data, ...prev]);
      toast({ title: "Candidat invité", description: `Lien : /interview/${data.token}` });
      setCandidateName("");
      setCandidateEmail("");
      setShowInvite(false);
    }
    setInviting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!project) return <p>Projet introuvable</p>;

  const statusLabel = { draft: "Brouillon", active: "Actif", archived: "Archivé" }[project.status as string] ?? project.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground">{project.job_title}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={project.status === "active" ? "default" : "secondary"}>{statusLabel}</Badge>
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
              <p><strong>Description :</strong> {project.description || "—"}</p>
              <p><strong>Langue :</strong> {project.language === "fr" ? "Français" : "English"}</p>
              <p><strong>Persona IA :</strong> {project.ai_persona_name}</p>
              <p><strong>Durée max :</strong> {project.max_duration_minutes} min</p>
              <p><strong>Audio :</strong> {project.record_audio ? "Oui" : "Non"}</p>
              <p><strong>Vidéo :</strong> {project.record_video ? "Oui" : "Non"}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showInvite} onOpenChange={setShowInvite}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Inviter un candidat</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Inviter un candidat</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nom</Label><Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} /></div>
                  <Button onClick={inviteCandidate} disabled={inviting} className="w-full">{inviting ? "..." : "Créer la session"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune session</p>
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
                      <td className="py-3"><SessionStatusBadge status={s.status} /></td>
                      <td className="py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">
                        {["pending", "video_viewed"].includes(s.status) && (
                          <Button variant="ghost" size="sm" onClick={() => copySessionLink(s.token)}>
                            <Copy className="mr-1 h-3 w-3" /> Copier le lien
                          </Button>
                        )}
                        {s.status === "completed" && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/sessions/${s.id}`}>Voir</Link>
                          </Button>
                        )}
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
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm">{q.content}</p>
                    <p className="text-xs text-muted-foreground capitalize">{q.type} {q.follow_up_enabled && "• Relances activées"}</p>
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

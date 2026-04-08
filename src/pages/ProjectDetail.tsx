import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProjectDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const copyProjectLink = () => {
    if (!project?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/interview/${project.slug}`);
    toast({ title: "Lien copié !" });
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
          <Button variant="outline" size="sm" onClick={copyProjectLink}>
            <Copy className="mr-1 h-4 w-4" /> Copier le lien candidat
          </Button>
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
              <p><strong>Lien candidat :</strong>{" "}
                <code className="text-xs bg-muted px-2 py-1 rounded">{window.location.origin}/interview/{project.slug}</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune session — les candidats apparaîtront ici quand ils utiliseront le lien.</p>
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

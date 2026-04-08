import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { ScoreCircle } from "@/components/ScoreCircle";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("sessions").select("*, projects(*)").eq("id", id).single(),
      supabase.from("reports").select("*").eq("session_id", id).single(),
      supabase.from("transcripts").select("*").eq("session_id", id).single(),
      supabase.from("session_messages").select("*").eq("session_id", id).order("timestamp"),
    ]).then(([sRes, rRes, tRes, mRes]) => {
      setSession(sRes.data);
      setReport(rRes.data);
      setTranscript(tRes.data);
      setMessages(mRes.data ?? []);
      setRecruiterNotes(rRes.data?.recruiter_notes ?? "");
      if (sRes.data) {
        supabase.from("questions").select("*").eq("project_id", (sRes.data as any).project_id).order("order_index").then(({ data }) => {
          setQuestions(data ?? []);
        });
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!report?.id) return;
    const timeout = setTimeout(() => {
      supabase.from("reports").update({ recruiter_notes: recruiterNotes }).eq("id", report.id);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [recruiterNotes, report?.id]);

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!session) return <p>Session introuvable</p>;

  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};
  const questionEvals = (report?.question_evaluations as Record<string, any>) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{session.candidate_name}</h1>
        <p className="text-muted-foreground">{session.candidate_email} • {(session.projects as any)?.job_title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Transcript */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Transcription</CardTitle></CardHeader>
            <CardContent>
              {transcript ? (
                <div className="max-h-96 overflow-y-auto space-y-3 text-sm">
                  {messages.map((m) => (
                    <div key={m.id} className={`p-2 rounded ${m.role === "ai" ? "bg-primary/5" : "bg-muted"}`}>
                      <span className="font-medium text-xs">{m.role === "ai" ? "🤖 IA" : "👤 Candidat"}</span>
                      <p className="mt-1">{m.content}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-muted-foreground">{transcript.formatted_text || transcript.full_text || "Pas de transcription disponible"}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Transcription non disponible</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Report */}
        <div className="space-y-4">
          {report ? (
            <>
              <Card>
                <CardContent className="pt-6 flex flex-col items-center gap-4">
                  <ScoreCircle score={Number(report.overall_score)} />
                  <RecommendationBadge recommendation={report.recommendation} />
                  {report.overall_grade && <Badge variant="outline">{report.overall_grade}</Badge>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
                <CardContent><p className="text-sm">{report.executive_summary}</p></CardContent>
              </Card>

              {report.strengths?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Points forts</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {(report.strengths as string[]).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-success">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {report.areas_for_improvement?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Axes d'amélioration</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {(report.areas_for_improvement as string[]).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-warning">⚠</span> {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {Object.keys(criteriaScores).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Scores par critère</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(criteriaScores).map(([key, val]: [string, any]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span>{val.label || key}</span>
                          <span className="font-medium">{val.score}/{val.max}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${(val.score / val.max) * 100}%` }}
                          />
                        </div>
                        {val.comment && <p className="text-xs text-muted-foreground mt-1">{val.comment}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Notes recruteur</CardTitle></CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Ajoutez vos observations personnelles…"
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Rapport non encore généré</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

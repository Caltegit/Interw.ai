import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Send, RefreshCw, CheckCircle2, Mail, ChevronDown, ChevronRight } from "lucide-react";
import { EditRecoveryTemplateDialog } from "@/components/superadmin/EditRecoveryTemplateDialog";
import { isReportUnusable } from "@/hooks/queries/useDashboardData";

type Reinvitation = {
  id: string;
  sent_at: string | null;
  email_status: string | null;
  new_session_id: string | null;
  new_session_status: string | null;
  new_completed_at: string | null;
  new_audio_health: any;
  new_executive_summary: string | null;
  new_job_status: string | null;
  new_has_media: boolean;
};

type Recoverable = {
  session_id: string;
  created_at: string;
  completed_at: string | null;
  candidate_name: string;
  candidate_email: string;
  project_id: string;
  project_title: string;
  organization_id: string;
  organization_name: string;
  session_status: string;
  has_media: boolean;
  audio_health: any;
  executive_summary: string | null;
  overall_score: number | null;
  report_job_status: string | null;
  reinvitations: Reinvitation[];
};

type Witness = {
  id: string;
  session_id: string;
  project_slug: string;
  token: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  n_real_files: number;
};

type ProjectRow = { id: string; slug: string; title: string; organization_name: string };

type Reason = "missing_media" | "audio_failed" | "empty_summary" | "job_failed";
type Lifecycle = "todo" | "resent" | "repassed";

const PUBLIC_APP_URL = "https://interw.ai";
function candidateUrl(slug: string, token: string) {
  return `${PUBLIC_APP_URL}/session/${slug}/start/${token}`;
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Détecte le motif principal d'anomalie sur la session d'origine.
 * Cohérent avec isReportUnusable (source unique côté TS).
 */
function detectReason(r: Recoverable): Reason | null {
  if (r.report_job_status === "failed") return "job_failed";
  const audioFailed = r.audio_health?.verdict === "failed";
  if (audioFailed) return "audio_failed";
  const hasReport = !!r.executive_summary || r.overall_score !== null;
  const emptySummary = hasReport && (!r.executive_summary || !String(r.executive_summary).trim());
  if (emptySummary) return "empty_summary";
  // Pas de média = signal fort d'échec upload (cas Inès), quel que soit le statut.
  if (!r.has_media) return "missing_media";
  return null;
}

/**
 * Une reprise est-elle exploitable ? Réutilise isReportUnusable pour rester
 * aligné avec le dashboard. Une reprise `pending` ou `cancelled` = pas réussie.
 */
function isReinvitationSuccessful(inv: Reinvitation): boolean {
  if (!inv.new_session_id) return false;
  if (inv.new_session_status !== "completed") return false;
  if (!inv.new_has_media) return false;
  return !isReportUnusable({
    report: {
      audio_health: inv.new_audio_health,
      executive_summary: inv.new_executive_summary,
    },
    jobStatus: inv.new_job_status,
  });
}

type ReinvitationStatus = "sending" | "pending" | "success" | "failed";

/**
 * Statut fin d'une reinvitation, utilisé pour l'affichage uniquement.
 * `computeLifecycle` reste basé sur `isReinvitationSuccessful` — inchangé.
 */
function getReinvitationStatus(inv: Reinvitation): ReinvitationStatus {
  if (!inv.new_session_id) return "sending";
  if (isReinvitationSuccessful(inv)) return "success";
  const s = inv.new_session_status;
  if (s === "pending" || s === "video_viewed" || s === "in_progress") return "pending";
  return "failed";
}


function computeLifecycle(r: Recoverable): Lifecycle {
  const sentInvs = r.reinvitations.filter((i) => i.email_status === "sent");
  if (sentInvs.length === 0) return "todo";
  if (r.reinvitations.some(isReinvitationSuccessful)) return "repassed";
  return "resent";
}

const REASON_LABEL: Record<Reason, string> = {
  missing_media: "Aucun média",
  audio_failed: "Audio KO",
  empty_summary: "Résumé vide",
  job_failed: "Rapport en échec",
};

const REASON_CLASS: Record<Reason, string> = {
  missing_media: "bg-red-100 text-red-800",
  audio_failed: "bg-orange-100 text-orange-800",
  empty_summary: "bg-amber-100 text-amber-900",
  job_failed: "bg-rose-100 text-rose-900",
};

const PAGE_SIZE = 50;

export default function AdminCandidatesToRecover() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Recoverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState<Lifecycle | "all">("todo");
  const [reasonFilter, setReasonFilter] = useState<Reason | "all">("all");
  const [singleConfirm, setSingleConfirm] = useState<Recoverable | null>(null);
  const [sending, setSending] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

  // Zone témoins
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [wName, setWName] = useState("");
  const [wEmail, setWEmail] = useState("");
  const [wProjectId, setWProjectId] = useState<string>("");
  const [creatingWitness, setCreatingWitness] = useState(false);

  async function loadImpacted() {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await (supabase.rpc as any)("admin_list_recoverable_candidates");
    if (error) {
      setRows([]);
      setLoadError(error.message);
      toast({ title: "Chargement impossible", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Recoverable[]);
    setLoading(false);
  }

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("id, slug, title, organizations(name)")
      .eq("status", "active")
      .order("title");
    const list: ProjectRow[] = (data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      organization_name: p.organizations?.name ?? "",
    }));
    setProjects(list);
    if (!wProjectId && list[0]) setWProjectId(list[0].id);
  }

  useEffect(() => {
    loadImpacted();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (witnesses.length === 0) return;
    const iv = setInterval(async () => {
      const ids = witnesses.map((w) => w.session_id);
      const { data: sess } = await supabase.from("sessions").select("id, status").in("id", ids);
      const updated = await Promise.all(
        witnesses.map(async (w) => {
          const { data: files } = await supabase.storage
            .from("media")
            .list(`interviews/${w.session_id}`, { limit: 100 });
          const n = (files ?? []).filter((f: any) => (f?.metadata?.size ?? 0) > 1024).length;
          const s = sess?.find((x: any) => x.id === w.session_id);
          return { ...w, status: s?.status ?? w.status, n_real_files: n };
        }),
      );
      setWitnesses(updated);
    }, 5000);
    return () => clearInterval(iv);
  }, [witnesses]);

  // Enrichissement : motif + cycle de vie calculés une fois.
  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        reason: detectReason(r),
        lifecycle: computeLifecycle(r),
      })),
    [rows],
  );

  // On ne garde que les vraies anomalies (reason != null).
  const anomalies = useMemo(() => enriched.filter((r) => r.reason !== null), [enriched]);

  const counts = useMemo(() => {
    const c = { todo: 0, resent: 0, repassed: 0 };
    anomalies.forEach((r) => c[r.lifecycle]++);
    return c;
  }, [anomalies]);

  const filtered = useMemo(() => {
    return anomalies.filter((r) => {
      if (lifecycleFilter !== "all" && r.lifecycle !== lifecycleFilter) return false;
      if (reasonFilter !== "all" && r.reason !== reasonFilter) return false;
      return true;
    });
  }, [anomalies, lifecycleFilter, reasonFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [lifecycleFilter, reasonFilter]);

  async function sendOne(sessionId: string, isWitness = false) {
    const { data, error } = await supabase.functions.invoke("resend-impacted-candidate", {
      body: { original_session_id: sessionId, is_witness: isWitness },
    });
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error ?? error?.message ?? "Erreur inconnue";
      throw new Error(msg);
    }
    return data as any;
  }

  async function handleSingle() {
    if (!singleConfirm) return;
    setSending(true);
    try {
      await sendOne(singleConfirm.session_id);
      toast({ title: "Invitation envoyée", description: singleConfirm.candidate_email });
      setSingleConfirm(null);
      await loadImpacted();
    } catch (e: any) {
      toast({ title: "Échec", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function createWitness() {
    if (!wName.trim() || !wEmail.trim() || !wProjectId) {
      toast({ title: "Champs manquants", variant: "destructive" });
      return;
    }
    setCreatingWitness(true);
    try {
      const project = projects.find((p) => p.id === wProjectId);
      if (!project) throw new Error("Projet introuvable");
      const { data: org } = await supabase
        .from("projects")
        .select("organization_id")
        .eq("id", wProjectId)
        .single();
      const { data: created, error } = await supabase
        .from("sessions")
        .insert({
          project_id: wProjectId,
          organization_id: (org as any).organization_id,
          candidate_name: wName.trim(),
          candidate_email: wEmail.trim(),
          status: "pending",
        } as any)
        .select("id, token")
        .single();
      if (error || !created) throw error ?? new Error("Insertion refusée");
      setWitnesses((w) => [
        ...w,
        {
          id: crypto.randomUUID(),
          session_id: (created as any).id,
          project_slug: project.slug,
          token: (created as any).token,
          candidate_name: wName.trim(),
          candidate_email: wEmail.trim(),
          status: "pending",
          n_real_files: 0,
        },
      ]);
      setWName("");
      setWEmail("");
      toast({ title: "Session témoin créée" });
    } catch (e: any) {
      toast({ title: "Création impossible", description: e.message, variant: "destructive" });
    } finally {
      setCreatingWitness(false);
    }
  }

  async function sendWitnessInvite(w: Witness) {
    try {
      await sendOne(w.session_id, true);
      toast({ title: "Invitation témoin envoyée", description: w.candidate_email });
    } catch (e: any) {
      toast({ title: "Échec", description: e.message, variant: "destructive" });
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => toast({ title: "Lien copié" }));
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Candidats à repasser</h1>
        <p className="text-muted-foreground">
          Surveillance continue des sessions défectueuses depuis le 20 juillet 2026.
        </p>
      </div>

      {/* Zone A — Témoins */}
      <Card>
        <CardHeader>
          <CardTitle>Tester avant d'envoyer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Crée une session témoin pour vérifier que l'upload fonctionne, avant tout renvoi.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input placeholder="Nom témoin" value={wName} onChange={(e) => setWName(e.target.value)} />
            <Input placeholder="E-mail témoin" type="email" value={wEmail} onChange={(e) => setWEmail(e.target.value)} />
            <Select value={wProjectId} onValueChange={setWProjectId}>
              <SelectTrigger><SelectValue placeholder="Projet" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title} — {p.organization_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={createWitness} disabled={creatingWitness}>Créer session témoin</Button>
          </div>

          {witnesses.length > 0 && (
            <div className="space-y-2">
              {witnesses.map((w) => {
                const url = candidateUrl(w.project_slug, w.token);
                const ok = w.n_real_files > 0;
                return (
                  <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                    <div className="flex-1 min-w-[220px]">
                      <div className="font-medium">{w.candidate_name} — {w.candidate_email}</div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="outline">{w.status}</Badge> · {w.n_real_files} fichier(s) média
                      </div>
                    </div>
                    {ok ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Upload OK
                      </Badge>
                    ) : (
                      <Badge variant="secondary">En attente</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => copyLink(url)}>
                      <Copy className="h-3 w-3 mr-1" /> Copier
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir
                    </Button>
                    <Button size="sm" onClick={() => sendWitnessInvite(w)}>
                      <Send className="h-3 w-3 mr-1" /> Envoyer
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone B — Suivi continu */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Suivi des anomalies</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setLifecycleFilter("todo")}>
                À renvoyer : <span className="ml-1 font-bold">{counts.todo}</span>
              </Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setLifecycleFilter("resent")}>
                Déjà renvoyée : <span className="ml-1 font-bold">{counts.resent}</span>
              </Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setLifecycleFilter("repassed")}>
                Session repassée : <span className="ml-1 font-bold">{counts.repassed}</span>
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditTemplateOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Modèle
            </Button>
            <Select value={reasonFilter} onValueChange={(v: any) => setReasonFilter(v)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous motifs</SelectItem>
                <SelectItem value="missing_media">Aucun média</SelectItem>
                <SelectItem value="audio_failed">Audio KO</SelectItem>
                <SelectItem value="empty_summary">Résumé vide</SelectItem>
                <SelectItem value="job_failed">Rapport en échec</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lifecycleFilter} onValueChange={(v: any) => setLifecycleFilter(v)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">À renvoyer</SelectItem>
                <SelectItem value="resent">Déjà renvoyée</SelectItem>
                <SelectItem value="repassed">Repassée</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadImpacted}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : loadError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {loadError}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Aucune anomalie pour ce filtre.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Projet</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Historique</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const nSent = r.reinvitations.filter((i) => i.email_status === "sent").length;
                    const lastInv = r.reinvitations[r.reinvitations.length - 1];
                    const lastStatus = lastInv ? getReinvitationStatus(lastInv) : null;
                    const showLastPending = r.lifecycle === "resent" && lastStatus === "pending";
                    const showLastFailed = r.lifecycle === "resent" && lastStatus === "failed";

                    const isExpanded = expanded[r.session_id];
                    return (
                      <>
                        <TableRow key={r.session_id}>
                          <TableCell>
                            {r.reinvitations.length > 0 && (
                              <button
                                onClick={() => setExpanded((e) => ({ ...e, [r.session_id]: !e[r.session_id] }))}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(r.created_at)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.candidate_name}</div>
                            <div className="text-xs text-muted-foreground">{r.candidate_email}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{r.project_title}</div>
                            <div className="text-xs text-muted-foreground">{r.organization_name}</div>
                          </TableCell>
                          <TableCell>
                            {r.reason && (
                              <Badge className={REASON_CLASS[r.reason]}>{REASON_LABEL[r.reason]}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.lifecycle === "todo" && <Badge variant="secondary">À renvoyer</Badge>}
                            {r.lifecycle === "resent" && (
                              <div className="space-y-1">
                                <Badge className="bg-blue-100 text-blue-800">Renvoyée</Badge>
                                {showLastPending && (
                                  <div className="text-xs text-muted-foreground">En attente de reprise</div>
                                )}
                                {showLastFailed && (
                                  <div className="text-xs text-orange-700">Reprise KO</div>
                                )}

                              </div>
                            )}
                            {r.lifecycle === "repassed" && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Repassée
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {nSent > 0 ? (
                              <span>{nSent} renvoi{nSent > 1 ? "s" : ""}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.lifecycle === "repassed" ? (
                              <span className="text-xs text-muted-foreground">Terminé</span>
                            ) : (
                              <Button size="sm" onClick={() => setSingleConfirm(r)}>
                                {r.lifecycle === "resent" ? "Renvoyer à nouveau" : "Renvoyer"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && r.reinvitations.length > 0 && (
                          <TableRow key={r.session_id + "-h"}>
                            <TableCell></TableCell>
                            <TableCell colSpan={7} className="bg-muted/30">
                              <div className="space-y-2 py-2">
                                {r.reinvitations.map((inv, idx) => {
                                  const success = isReinvitationSuccessful(inv);
                                  return (
                                    <div key={inv.id} className="flex flex-wrap items-center gap-3 text-xs">
                                      <span className="font-medium">#{idx + 1}</span>
                                      <span>{formatDate(inv.sent_at)}</span>
                                      <Badge variant="outline" className="text-xs">
                                        Mail : {inv.email_status ?? "?"}
                                      </Badge>
                                      {inv.new_session_id ? (
                                        <>
                                          <Badge variant="outline" className="text-xs">
                                            Nouvelle session : {inv.new_session_status ?? "?"}
                                          </Badge>
                                          {success ? (
                                            <Badge className="bg-green-100 text-green-800 text-xs">Exploitable</Badge>
                                          ) : inv.new_session_status === "completed" ? (
                                            <Badge className="bg-orange-100 text-orange-800 text-xs">Re-cassée</Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs">En attente</Badge>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground">Pas de nouvelle session</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {filtered.length} anomalies · page {page} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      Précédent
                    </Button>
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!singleConfirm} onOpenChange={(o) => !o && setSingleConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renvoyer une invitation</DialogTitle>
            <DialogDescription>
              Une nouvelle session sera créée et un e-mail sera envoyé à{" "}
              <strong>{singleConfirm?.candidate_email}</strong> ({singleConfirm?.candidate_name}).
              {singleConfirm && singleConfirm.reinvitations.length > 0 && (
                <div className="mt-2 text-xs">
                  Historique : {singleConfirm.reinvitations.length} tentative
                  {singleConfirm.reinvitations.length > 1 ? "s" : ""} précédente
                  {singleConfirm.reinvitations.length > 1 ? "s" : ""}.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleConfirm(null)}>Annuler</Button>
            <Button onClick={handleSingle} disabled={sending}>
              {sending ? "Envoi…" : "Confirmer et envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditRecoveryTemplateDialog open={editTemplateOpen} onOpenChange={setEditTemplateOpen} />
    </div>
  );
}

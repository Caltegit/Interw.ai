import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  RefreshCw, Search, MoreHorizontal, ExternalLink, RotateCcw, XCircle,
  Mail as MailIcon, FileText, Mic2, Copy, ChevronDown, ChevronRight, AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 50;

type Row = {
  session_id: string;
  session_token: string;
  candidate_name: string;
  candidate_email: string;
  session_status: string;
  is_demo: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  project_id: string;
  project_title: string;
  organization_id: string;
  organization_name: string;
  segments_total: number;
  segments_done: number;
  report_id: string | null;
  report_overall_score: number | null;
  report_generated_at: string | null;
  job_status: string | null;
  job_attempts: number | null;
  job_max_attempts: number | null;
  job_next_attempt_at: string | null;
  job_locked_until: string | null;
  job_last_error: string | null;
  job_updated_at: string | null;
  email_status: string | null;
  email_created_at: string | null;
  email_error: string | null;
  total_count: number;
};

const SESSION_STATUS_OPTIONS = ["pending", "in_progress", "completed", "cancelled", "expired"];
const JOB_STATUS_OPTIONS = ["none", "queued", "processing", "done", "failed", "cancelled"];
const EMAIL_STATUS_OPTIONS = ["none", "pending", "sent", "failed", "dlq", "suppressed", "bounced"];

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function SessionsQueueTab() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [sessionStatus, setSessionStatus] = useState<string>("all");
  const [jobStatus, setJobStatus] = useState<string>("all");
  const [emailStatus, setEmailStatus] = useState<string>("all");
  const [excludeDemo, setExcludeDemo] = useState(true);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ title: string; desc: string; action: () => void } | null>(null);

  const statsQuery = useQuery({
    queryKey: ["admin-sq-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_sessions_queue_stats", {
        p_window: "24 hours",
      });
      if (error) throw error;
      return data as Record<string, number>;
    },
    refetchInterval: 30_000,
  });

  const rowsQuery = useQuery({
    queryKey: ["admin-sq-rows", search, sessionStatus, jobStatus, emailStatus, excludeDemo, anomaliesOnly, page],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_search_sessions", {
        p_search: search || null,
        p_session_statuses: sessionStatus === "all" ? null : [sessionStatus],
        p_job_statuses: jobStatus === "all" ? null : [jobStatus],
        p_email_statuses: emailStatus === "all" ? null : [emailStatus],
        p_org_id: null,
        p_exclude_demo: excludeDemo,
        p_anomalies_only: anomaliesOnly,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 15_000,
  });

  const rows = rowsQuery.data ?? [];
  const total = rows[0]?.total_count ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-sq-rows"] });
    qc.invalidateQueries({ queryKey: ["admin-sq-stats"] });
  };

  const forceJob = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await (supabase as any).rpc("admin_force_report_job", { p_session_id: sid });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Job remis en file"); invalidate(); },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const cancelJob = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await (supabase as any).rpc("admin_cancel_report_job", { p_session_id: sid });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Job annulé"); invalidate(); },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const runTranscribe = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.functions.invoke("transcribe-session", { body: { session_id: sid } });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Transcription relancée"),
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const runGenerateReport = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.functions.invoke("generate-report", { body: { session_id: sid } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Génération de rapport relancée"); invalidate(); },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const resendThankYou = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "candidate-thank-you",
          recipientEmail: row.candidate_email,
          idempotencyKey: `candidate-thanks-${row.session_id}-manual-${Date.now()}`,
          templateData: {
            firstName: (row.candidate_name ?? "").trim().split(/\s+/)[0] ?? "",
            jobTitle: row.project_title,
            orgName: row.organization_name,
          },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Email renvoyé"); invalidate(); },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const cancelSession = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await (supabase as any)
        .from("sessions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session annulée"); invalidate(); },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const toggleExpand = (sid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  };

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Toutes les sessions, transcripts, rapports et emails.
        </p>
        <Button variant="outline" size="sm" onClick={() => { rowsQuery.refetch(); statsQuery.refetch(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Sessions 24h" value={stats?.total_sessions} />
        <StatCard label="Complétées 24h" value={stats?.completed_sessions} />
        <StatCard label="Rapports 24h" value={stats?.reports_generated} />
        <StatCard label="Jobs en file" value={stats?.jobs_queued} />
        <StatCard label="Jobs échec 24h" value={stats?.jobs_failed} accent={stats?.jobs_failed ? "destructive" : undefined} />
        <StatCard label="Emails échec 24h" value={stats?.emails_failed} accent={stats?.emails_failed ? "destructive" : undefined} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher candidat, email, poste, organisation, session.id ou token…"
                className="pl-9"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
              />
            </div>
            <Select value={sessionStatus} onValueChange={(v) => { setSessionStatus(v); setPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Statut session" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts session</SelectItem>
                {SESSION_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={jobStatus} onValueChange={(v) => { setJobStatus(v); setPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Statut job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts job</SelectItem>
                {JOB_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={emailStatus} onValueChange={(v) => { setEmailStatus(v); setPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Statut email" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts email</SelectItem>
                {EMAIL_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Switch id="excl-demo" checked={excludeDemo} onCheckedChange={(v) => { setExcludeDemo(v); setPage(0); }} />
              <Label htmlFor="excl-demo">Exclure démos</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="anomalies" checked={anomaliesOnly} onCheckedChange={(v) => { setAnomaliesOnly(v); setPage(0); }} />
              <Label htmlFor="anomalies">Anomalies uniquement</Label>
            </div>
            <div className="ml-auto text-muted-foreground">
              {total} session{total > 1 ? "s" : ""} • page {page + 1}/{Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 w-6"></th>
                  <th className="py-2 pr-3">Candidat</th>
                  <th className="py-2 pr-3">Poste · Org</th>
                  <th className="py-2 pr-3">Session</th>
                  <th className="py-2 pr-3">Transcript</th>
                  <th className="py-2 pr-3">Rapport</th>
                  <th className="py-2 pr-3">Job</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <RowItem
                    key={r.session_id}
                    row={r}
                    expanded={expanded.has(r.session_id)}
                    onToggle={() => toggleExpand(r.session_id)}
                    onForce={() => setConfirm({
                      title: "Forcer la génération du rapport ?",
                      desc: "Le job sera réinitialisé (attempts=0) et repris dans la minute.",
                      action: () => forceJob.mutate(r.session_id),
                    })}
                    onCancelJob={() => setConfirm({
                      title: "Annuler le job ?",
                      desc: "Les retries automatiques s'arrêtent.",
                      action: () => cancelJob.mutate(r.session_id),
                    })}
                    onTranscribe={() => runTranscribe.mutate(r.session_id)}
                    onGenerate={() => runGenerateReport.mutate(r.session_id)}
                    onResendEmail={() => setConfirm({
                      title: "Renvoyer le thank-you email ?",
                      desc: `Destinataire : ${r.candidate_email}. Bypasse l'idempotence 30j.`,
                      action: () => resendThankYou.mutate(r),
                    })}
                    onCancelSession={() => setConfirm({
                      title: "Marquer la session comme annulée ?",
                      desc: "Action irréversible côté UI candidat.",
                      action: () => cancelSession.mutate(r.session_id),
                    })}
                  />
                ))}
                {rows.length === 0 && !rowsQuery.isLoading && (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Aucune session</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Précédent
            </Button>
            <Button variant="outline" size="sm"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}>
              Suivant
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm?.action(); setConfirm(null); }}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowItem({
  row, expanded, onToggle,
  onForce, onCancelJob, onTranscribe, onGenerate, onResendEmail, onCancelSession,
}: {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
  onForce: () => void;
  onCancelJob: () => void;
  onTranscribe: () => void;
  onGenerate: () => void;
  onResendEmail: () => void;
  onCancelSession: () => void;
}) {
  const anomaly =
    (row.session_status === "completed" && !row.report_id) ||
    row.job_status === "failed" ||
    (row.job_attempts ?? 0) >= 3 ||
    ["failed", "dlq", "bounced"].includes(row.email_status ?? "");

  return (
    <>
      <tr className={`border-b last:border-0 hover:bg-muted/30 ${anomaly ? "bg-destructive/5" : ""}`}>
        <td className="py-2">
          <button onClick={onToggle} className="p-1 hover:bg-muted rounded" aria-label="Détails">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="py-2 pr-3">
          <div className="font-medium flex items-center gap-1">
            {anomaly && <AlertTriangle className="h-3 w-3 text-destructive" />}
            {row.candidate_name || "—"}
          </div>
          <div className="text-xs text-muted-foreground">{row.candidate_email}</div>
        </td>
        <td className="py-2 pr-3">
          <Link to={`/projects/${row.project_id}`} className="hover:underline">{row.project_title}</Link>
          <div className="text-xs text-muted-foreground">{row.organization_name}</div>
        </td>
        <td className="py-2 pr-3">
          <SessionStatusBadge status={row.session_status} />
          <div className="text-xs text-muted-foreground mt-0.5">
            {row.completed_at
              ? `Fini ${formatDistanceToNow(new Date(row.completed_at), { addSuffix: true, locale: fr })}`
              : row.started_at
              ? `Démarré ${formatDistanceToNow(new Date(row.started_at), { addSuffix: true, locale: fr })}`
              : `Créé ${formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: fr })}`}
          </div>
        </td>
        <td className="py-2 pr-3">
          <TranscriptBadge done={row.segments_done} total={row.segments_total} />
        </td>
        <td className="py-2 pr-3">
          {row.report_id ? (
            <Link to={`/sessions/${row.session_id}`} className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
              <FileText className="h-3 w-3" /> {row.report_overall_score != null ? Number(row.report_overall_score).toFixed(1) : "✓"}
            </Link>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </td>
        <td className="py-2 pr-3"><JobCell row={row} /></td>
        <td className="py-2 pr-3"><EmailBadge status={row.email_status} /></td>
        <td className="py-2 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to={`/sessions/${row.session_id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir la session
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onForce}>
                <RotateCcw className="h-4 w-4 mr-2" /> Forcer le job rapport
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCancelJob} disabled={!row.job_status || row.job_status === "cancelled"}>
                <XCircle className="h-4 w-4 mr-2" /> Annuler le job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTranscribe}>
                <Mic2 className="h-4 w-4 mr-2" /> Relancer transcription
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onGenerate}>
                <FileText className="h-4 w-4 mr-2" /> Relancer génération rapport
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResendEmail}>
                <MailIcon className="h-4 w-4 mr-2" /> Renvoyer thank-you email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onCancelSession}
                disabled={row.session_status === "cancelled"}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" /> Annuler la session
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(row.session_id); toast.success("ID copié"); }}>
                <Copy className="h-4 w-4 mr-2" /> Copier session.id
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(row.session_token); toast.success("Token copié"); }}>
                <Copy className="h-4 w-4 mr-2" /> Copier token
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td></td>
          <td colSpan={8} className="py-3 pr-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold mb-1">Job rapport</div>
                <KV k="Statut" v={row.job_status ?? "aucun"} />
                <KV k="Tentatives" v={row.job_status ? `${row.job_attempts}/${row.job_max_attempts}` : "—"} />
                <KV k="Prochain essai" v={row.job_next_attempt_at ? new Date(row.job_next_attempt_at).toLocaleString("fr-FR") : "—"} />
                <KV k="Verrou jusqu'à" v={row.job_locked_until ? new Date(row.job_locked_until).toLocaleString("fr-FR") : "—"} />
                <KV k="MAJ" v={row.job_updated_at ? new Date(row.job_updated_at).toLocaleString("fr-FR") : "—"} />
              </div>
              <div>
                <div className="font-semibold mb-1">Rapport</div>
                <KV k="ID" v={row.report_id ?? "—"} />
                <KV k="Score" v={row.report_overall_score != null ? Number(row.report_overall_score).toFixed(2) : "—"} />
                <KV k="Généré" v={row.report_generated_at ? new Date(row.report_generated_at).toLocaleString("fr-FR") : "—"} />
                <div className="font-semibold mt-3 mb-1">Email candidat</div>
                <KV k="Statut" v={row.email_status ?? "aucun"} />
                <KV k="Date" v={row.email_created_at ? new Date(row.email_created_at).toLocaleString("fr-FR") : "—"} />
              </div>
              <div>
                <div className="font-semibold mb-1">Dernière erreur job</div>
                <pre className="whitespace-pre-wrap break-words text-destructive bg-background border rounded p-2 max-h-48 overflow-auto">
                  {row.job_last_error ?? "—"}
                </pre>
                {row.email_error && (
                  <>
                    <div className="font-semibold mt-2 mb-1">Erreur email</div>
                    <pre className="whitespace-pre-wrap break-words text-destructive bg-background border rounded p-2 max-h-24 overflow-auto">
                      {row.email_error}
                    </pre>
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">{k}</span><span className="font-mono break-all">{v}</span></div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    in_progress: "secondary",
    pending: "outline",
    cancelled: "destructive",
    expired: "destructive",
  };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

function TranscriptBadge({ done, total }: { done: number; total: number }) {
  if (total === 0) return <Badge variant="outline" className="text-muted-foreground">0/0</Badge>;
  const complete = done === total;
  const empty = done === 0;
  return (
    <Badge variant={complete ? "default" : empty ? "destructive" : "secondary"}>
      {done}/{total}
    </Badge>
  );
}

function JobCell({ row }: { row: Row }) {
  if (!row.job_status) return <Badge variant="outline" className="text-muted-foreground">aucun</Badge>;
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    queued: "secondary",
    processing: "default",
    done: "outline",
    failed: "destructive",
    cancelled: "outline",
  };
  return (
    <div className="space-y-0.5">
      <Badge variant={variant[row.job_status] ?? "outline"}>{row.job_status}</Badge>
      <div className="text-[10px] text-muted-foreground">
        {row.job_attempts}/{row.job_max_attempts}
        {row.job_last_error && (
          <Tooltip>
            <TooltipTrigger className="text-destructive ml-1 underline">erreur</TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-wrap break-words">{row.job_last_error}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function EmailBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">aucun</Badge>;
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    sent: "default",
    pending: "secondary",
    failed: "destructive",
    dlq: "destructive",
    bounced: "destructive",
    suppressed: "outline",
  };
  return <Badge variant={variant[status] ?? "outline"}>{status}</Badge>;
}

function StatCard({ label, value, accent }: { label: string; value: number | undefined; accent?: "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold tabular-nums ${accent === "destructive" ? "text-destructive" : ""}`}>
          {value ?? "—"}
        </div>
      </CardContent>
    </Card>
  );
}

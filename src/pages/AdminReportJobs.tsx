import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshCw, RotateCcw, XCircle } from "lucide-react";

type JobStatus = "queued" | "processing" | "done" | "failed" | "cancelled";

interface Job {
  session_id: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  locked_until: string | null;
  last_error: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const STATUS_BADGE: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued:     { label: "En file",     variant: "secondary" },
  processing: { label: "En cours",    variant: "default" },
  done:       { label: "Terminé",     variant: "outline" },
  failed:     { label: "Échec",       variant: "destructive" },
  cancelled:  { label: "Annulé",      variant: "outline" },
};

export default function AdminReportJobs() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  const jobsQuery = useQuery({
    queryKey: ["admin-report-jobs", statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("report_jobs")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    refetchInterval: 10_000,
  });

  const statsQuery = useQuery({
    queryKey: ["admin-report-jobs-stats"],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [queued, processing, failed24, done24] = await Promise.all([
        (supabase as any).from("report_jobs").select("session_id", { count: "exact", head: true }).eq("status", "queued"),
        (supabase as any).from("report_jobs").select("session_id", { count: "exact", head: true }).eq("status", "processing"),
        (supabase as any).from("report_jobs").select("session_id", { count: "exact", head: true }).eq("status", "failed").gte("updated_at", since24h),
        (supabase as any).from("report_jobs").select("session_id", { count: "exact", head: true }).eq("status", "done").gte("completed_at", since24h),
      ]);
      return {
        queued: queued.count ?? 0,
        processing: processing.count ?? 0,
        failed24: failed24.count ?? 0,
        done24: done24.count ?? 0,
      };
    },
    refetchInterval: 10_000,
  });

  const retryMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await (supabase as any)
        .from("report_jobs")
        .update({ status: "queued", attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null })
        .eq("session_id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job remis en file");
      qc.invalidateQueries({ queryKey: ["admin-report-jobs"] });
      qc.invalidateQueries({ queryKey: ["admin-report-jobs-stats"] });
    },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const cancelMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await (supabase as any)
        .from("report_jobs")
        .update({ status: "cancelled" })
        .eq("session_id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job annulé");
      qc.invalidateQueries({ queryKey: ["admin-report-jobs"] });
    },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const runWorkerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("process-report-queue", { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Worker déclenché");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["admin-report-jobs"] }), 2000);
    },
    onError: (e: any) => toast.error(`Échec : ${e?.message ?? e}`),
  });

  const stats = statsQuery.data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">File de génération des rapports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => jobsQuery.refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Rafraîchir
          </Button>
          <Button size="sm" onClick={() => runWorkerMutation.mutate()} disabled={runWorkerMutation.isPending}>
            Forcer un run du worker
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="En file" value={stats?.queued ?? "—"} />
        <StatCard label="En cours" value={stats?.processing ?? "—"} />
        <StatCard label="Échecs (24h)" value={stats?.failed24 ?? "—"} accent="destructive" />
        <StatCard label="Terminés (24h)" value={stats?.done24 ?? "—"} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Jobs ({jobsQuery.data?.length ?? 0})</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="queued">En file</SelectItem>
              <SelectItem value="processing">En cours</SelectItem>
              <SelectItem value="failed">Échecs</SelectItem>
              <SelectItem value="done">Terminés</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Session</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Tentatives</th>
                  <th className="py-2 pr-3">Prochain essai</th>
                  <th className="py-2 pr-3">Dernière erreur</th>
                  <th className="py-2 pr-3">MAJ</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(jobsQuery.data ?? []).map((j) => (
                  <tr key={j.session_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-mono text-xs">
                      <Link to={`/sessions/${j.session_id}`} className="hover:underline text-primary">
                        {j.session_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={STATUS_BADGE[j.status].variant}>{STATUS_BADGE[j.status].label}</Badge>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{j.attempts} / {j.max_attempts}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {j.status === "queued"
                        ? formatDistanceToNow(new Date(j.next_attempt_at), { addSuffix: true, locale: fr })
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs max-w-md truncate">
                      {j.last_error ? (
                        <Tooltip>
                          <TooltipTrigger className="text-left text-destructive truncate block max-w-md">
                            {j.last_error}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xl whitespace-pre-wrap break-words">
                            {j.last_error}
                          </TooltipContent>
                        </Tooltip>
                      ) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(j.updated_at), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        {(j.status === "failed" || j.status === "cancelled") && (
                          <Button size="sm" variant="ghost" onClick={() => retryMutation.mutate(j.session_id)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {(j.status === "queued" || j.status === "failed") && (
                          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate(j.session_id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(jobsQuery.data?.length ?? 0) === 0 && !jobsQuery.isLoading && (
                  <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Aucun job</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-3xl font-semibold tabular-nums ${accent === "destructive" ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

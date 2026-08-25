import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MousePointerClick, FileText, Play, CheckCircle2, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProjectStats, type StatsPeriod } from "@/hooks/queries/useProjectStats";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s.toString().padStart(2, "0")}`;
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toFixed(1).replace(".", ",")} %`;
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  subline: string;
  tone?: "default" | "success";
}

function KpiCard({ icon: Icon, label, value, subline, tone = "default" }: KpiCardProps) {
  return (
    <Card className={tone === "success" ? "border-success/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString("fr-FR")}</div>
        <div className="mt-1 text-xs text-muted-foreground">{subline}</div>
      </CardContent>
    </Card>
  );
}

export default function ProjectStats() {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const { data, isLoading } = useProjectStats(id, period);

  const outcomeRows = useMemo(() => {
    if (!data) return [];
    const total = data.completed + data.abandoned + data.cancelled + data.pendingNotStarted;
    const row = (label: string, n: number, color: string) => ({
      label,
      n,
      pct: total ? (n / total) * 100 : 0,
      color,
    });
    return [
      row("Complétées", data.completed, "bg-success"),
      row("Abandonnées en cours", data.abandoned, "bg-warning"),
      row("Annulées", data.cancelled, "bg-destructive"),
      row("En attente", data.pendingNotStarted, "bg-muted-foreground"),
    ];
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to={`/projects/${id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Retour au poste
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Statistiques · {data.project?.title ?? "Poste"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi de l'acquisition et de la conversion des candidats sur la période.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)}>
          <TabsList>
            <TabsTrigger value="7d">7 jours</TabsTrigger>
            <TabsTrigger value="30d">30 jours</TabsTrigger>
            <TabsTrigger value="90d">90 jours</TabsTrigger>
            <TabsTrigger value="all">Tout</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Entonnoir */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={MousePointerClick}
          label="Clics"
          value={data.clicks}
          subline="visites uniques sur le lien candidat"
        />
        <KpiCard
          icon={FileText}
          label="Formulaires remplis"
          value={data.forms}
          subline={`${pct(data.forms, data.clicks)} des clics`}
        />
        <KpiCard
          icon={Play}
          label="Entretiens démarrés"
          value={data.started}
          subline={`${pct(data.started, data.forms)} des formulaires`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Entretiens complétés"
          value={data.completed}
          subline={`${pct(data.completed, data.started)} des démarrés`}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Statut des sessions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Statut des sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outcomeRows.every((r) => r.n === 0) ? (
              <p className="text-sm text-muted-foreground">Aucune session sur la période.</p>
            ) : (
              outcomeRows.map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{r.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.n} · {r.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Durée */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Durée d'entretien sur {data.completed} session{data.completed > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Moyenne</span>
              <span className="font-medium">{formatDuration(data.avgDurationSeconds)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Min</span>
              <span className="font-medium">{formatDuration(data.minDurationSeconds)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max</span>
              <span className="font-medium">{formatDuration(data.maxDurationSeconds)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activité dans le temps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité dans le temps</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const firstIdx = data.timeseries.findIndex(
              (d: any) => (d.clicks || 0) + (d.forms || 0) + (d.started || 0) + (d.completed || 0) > 0,
            );
            const trimmed = firstIdx >= 0 ? data.timeseries.slice(firstIdx) : [];
            const formatDay = (d: string) => {
              const parts = d.split("-"); // yyyy-mm-dd
              if (parts.length === 3) return `${Number(parts[2])}/${Number(parts[1])}`;
              const dt = new Date(d);
              return Number.isNaN(dt.getTime()) ? d : `${dt.getDate()}/${dt.getMonth() + 1}`;
            };
            if (trimmed.length === 0) {
              return <p className="text-sm text-muted-foreground">Pas encore de données.</p>;
            }
            return (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trimmed} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g-clicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g-forms" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g-completed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={formatDay}
                      interval={0}
                      minTickGap={4}
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(l) => formatDay(String(l))}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="clicks" name="Clics" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g-clicks)" />
                    <Area type="monotone" dataKey="forms" name="Formulaires" stroke="hsl(var(--info))" strokeWidth={2} fill="url(#g-forms)" />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Complétées"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      fill="url(#g-completed)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Sources de trafic
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topReferrers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune visite enregistrée pour l'instant.</p>
          ) : (
            <ul className="space-y-2">
              {data.topReferrers.map((r) => (
                <li key={r.host} className="flex items-center justify-between text-sm">
                  <span className="truncate">{r.host}</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {r.count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

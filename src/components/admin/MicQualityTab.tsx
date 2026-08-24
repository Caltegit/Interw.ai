import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshCw, Mic2, ExternalLink } from "lucide-react";

interface MicEventRow {
  id: string;
  session_id: string;
  event: string;
  data: Record<string, unknown>;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  device_type: string | null;
  created_at: string;
}

interface SessionInfo {
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  project_title: string;
  event_count: number;
  last_event_at: string;
  browser: string | null;
  os: string | null;
  events: MicEventRow[];
}

const EVENT_LABELS: Record<string, string> = {
  mic_health_track_dead: "Piste morte",
  mic_health_silent: "Silence détecté",
  mic_too_quiet: "Signal trop faible",
  mic_reacquire_start: "Réacquisition micro",
  mic_reacquire_failed: "Réacquisition échouée",
  mic_reacquire_ok: "Micro réactivé",
  mic_health_unmuted: "Micro débloqué",
  mic_health_recovered: "Micro récupéré",
  interview_media_access_failed: "Accès média refusé",
  interview_audio_recorder_error: "Erreur enregistreur audio",
  interview_audio_recorder_failed: "Échec enregistreur audio",
  interview_mic_precheck_failed: "Pré-check micro échoué",
  interview_mic_precheck_soft: "Pré-check micro faible",
  interview_audio_device_disappeared: "Périphérique disparu",
};

const EVENT_SEVERITY: Record<string, "error" | "warn" | "info"> = {
  mic_health_track_dead: "error",
  mic_reacquire_failed: "error",
  interview_media_access_failed: "error",
  interview_audio_recorder_failed: "error",
  interview_mic_precheck_failed: "error",
  mic_health_silent: "warn",
  mic_too_quiet: "warn",
  mic_reacquire_start: "info",
  mic_reacquire_ok: "info",
  mic_health_unmuted: "info",
  mic_health_recovered: "info",
  interview_mic_precheck_soft: "warn",
  interview_audio_recorder_error: "warn",
  interview_audio_device_disappeared: "warn",
};

export default function MicQualityTab() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [stats, setStats] = useState<{ byBrowser: Record<string, number>; byOs: Record<string, number>; total: number }>({ byBrowser: {}, byOs: {}, total: 0 });

  const load = async () => {
    setLoading(true);
    try {
      // Récupère les événements des 7 derniers jours
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events, error } = await supabase
        .from("mic_events")
        .select("id, session_id, event, data, browser, browser_version, os, device_type, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!events || events.length === 0) {
        setSessions([]);
        setStats({ byBrowser: {}, byOs: {}, total: 0 });
        return;
      }

      // Groupe par session
      const bySession = new Map<string, MicEventRow[]>();
      for (const ev of events as MicEventRow[]) {
        const arr = bySession.get(ev.session_id) ?? [];
        arr.push(ev);
        bySession.set(ev.session_id, arr);
      }

      // Récupère les infos candidat pour chaque session
      const sessionIds = [...bySession.keys()];
      const { data: sessRows } = await supabase
        .from("sessions")
        .select("id, candidate_name, candidate_email, project_id")
        .in("id", sessionIds);

      const projectIds = [...new Set((sessRows ?? []).map((s) => s.project_id))];
      const { data: projRows } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", projectIds);

      const projMap = new Map((projRows ?? []).map((p) => [p.id, p.title]));
      const sessMap = new Map((sessRows ?? []).map((s) => [s.id, s]));

      const result: SessionInfo[] = sessionIds.map((sid) => {
        const evs = bySession.get(sid)!;
        const sess = sessMap.get(sid);
        const first = evs[0];
        return {
          session_id: sid,
          candidate_name: sess?.candidate_name ?? "Candidat",
          candidate_email: sess?.candidate_email ?? "",
          project_title: projMap.get(sess?.project_id ?? "") ?? "",
          event_count: evs.length,
          last_event_at: evs[0].created_at,
          browser: first.browser,
          os: first.os,
          events: evs,
        };
      });

      // Trie par nombre d'événements décroissant
      result.sort((a, b) => b.event_count - a.event_count);
      setSessions(result);

      // Stats globales
      const byBrowser: Record<string, number> = {};
      const byOs: Record<string, number> = {};
      for (const ev of events as MicEventRow[]) {
        const b = ev.browser ?? "Inconnu";
        byBrowser[b] = (byBrowser[b] ?? 0) + 1;
        const o = ev.os ?? "Inconnu";
        byOs[o] = (byOs[o] ?? 0) + 1;
      }
      setStats({ byBrowser, byOs, total: events.length });
    } catch (err) {
      console.error("MicQualityTab load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mic2 className="h-5 w-5" />
            Qualité micro — 7 derniers jours
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} événement{stats.total > 1 ? "s" : ""} sur {sessions.length} session{sessions.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats par navigateur / OS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Par navigateur</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byBrowser)
              .sort((a, b) => b[1] - a[1])
              .map(([browser, count]) => (
                <div key={browser} className="flex items-center justify-between text-sm">
                  <span>{browser}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            {Object.keys(stats.byBrowser).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Par système</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byOs)
              .sort((a, b) => b[1] - a[1])
              .map(([os, count]) => (
                <div key={os} className="flex items-center justify-between text-sm">
                  <span>{os}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            {Object.keys(stats.byOs).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Liste des sessions avec incidents */}
      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.session_id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{s.candidate_name}</span>
                    {s.project_title && (
                      <Badge variant="outline" className="text-xs">{s.project_title}</Badge>
                    )}
                    {s.browser && <Badge variant="secondary" className="text-xs">{s.browser}</Badge>}
                    {s.os && <Badge variant="secondary" className="text-xs">{s.os}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.event_count} événement{s.event_count > 1 ? "s" : ""} · il y a {formatDistanceToNow(new Date(s.last_event_at), { locale: fr })}
                  </p>
                  {/* Détail des événements */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {s.events.slice(0, 8).map((ev) => {
                      const sev = EVENT_SEVERITY[ev.event] ?? "info";
                      const label = EVENT_LABELS[ev.event] ?? ev.event;
                      return (
                        <Badge
                          key={ev.id}
                          variant={sev === "error" ? "destructive" : sev === "warn" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {label}
                        </Badge>
                      );
                    })}
                    {s.events.length > 8 && (
                      <Badge variant="outline" className="text-xs">+{s.events.length - 8}</Badge>
                    )}
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/sessions/${s.session_id}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sessions.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Mic2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun incident micro enregistré sur les 7 derniers jours.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

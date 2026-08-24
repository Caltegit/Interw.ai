import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search, Mail } from "lucide-react";

type LogRow = {
  id: string;
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

type Stats = { total: number; sent: number; pending: number; failed: number; suppressed: number };

const PRESETS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };

const statusColor = (s: string) => {
  switch (s) {
    case "sent":
      return "bg-success/15 text-success border-success/30";
    case "failed":
    case "dlq":
    case "bounced":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "suppressed":
    case "complained":
      return "bg-warning/15 text-warning border-warning/30";
    case "pending":
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function AdminEmails() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<string>("7d");
  const [customSince, setCustomSince] = useState<string>("");
  const [customUntil, setCustomUntil] = useState<string>("");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, pending: 0, failed: 0, suppressed: 0 });
  const [templates, setTemplates] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let since: string;
    let until = new Date().toISOString();
    if (preset === "custom" && customSince) {
      since = new Date(customSince).toISOString();
      if (customUntil) until = new Date(customUntil).toISOString();
    } else {
      const days = PRESETS[preset] ?? 7;
      since = new Date(Date.now() - days * 86400000).toISOString();
    }
    const { data, error } = await supabase.functions.invoke("admin-list-emails", {
      body: {
        since,
        until,
        template: template === "all" ? null : template,
        status: status === "all" ? null : status,
        search: search || null,
        page,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setRows(data.rows || []);
    setStats(data.stats);
    setTemplates(data.templates || []);
    setTotal(data.total || 0);
  }, [preset, customSince, customUntil, template, status, search, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleRetry = async (messageId: string) => {
    setRetrying(messageId);
    const { error } = await supabase.functions.invoke("retry-email", {
      body: { message_id: messageId },
    });
    setRetrying(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Email réenfilé", description: "Le renvoi a été ajouté à la file." });
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Santé des emails</h1>
          <p className="text-sm text-muted-foreground">
            Surveillance des envois transactionnels et auth — déduplication par <code>message_id</code>.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Envoyés</p>
            <p className="text-2xl font-bold text-success">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Échoués</p>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Supprimés</p>
            <p className="text-2xl font-bold text-warning">{stats.suppressed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {(["24h", "7d", "30d", "custom"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={preset === p ? "default" : "outline"}
                onClick={() => {
                  setPage(0);
                  setPreset(p);
                }}
              >
                {p === "24h" ? "24h" : p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "Personnalisé"}
              </Button>
            ))}
            {preset === "custom" && (
              <>
                <Input
                  type="datetime-local"
                  value={customSince}
                  onChange={(e) => setCustomSince(e.target.value)}
                  className="w-auto"
                />
                <Input
                  type="datetime-local"
                  value={customUntil}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  className="w-auto"
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={template}
              onValueChange={(v) => {
                setPage(0);
                setTemplate(v);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les templates</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => {
                setPage(0);
                setStatus(v);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="sent">Envoyés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoués</SelectItem>
                <SelectItem value="dlq">DLQ</SelectItem>
                <SelectItem value="suppressed">Supprimés</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              <Input
                placeholder="Rechercher par destinataire…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
              <Button size="sm" variant="outline" onClick={onSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Template</th>
                  <th className="pb-2 font-medium">Destinataire</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th className="pb-2 font-medium">Erreur</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Aucun email sur cette période.
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const isFailed = r.status === "failed" || r.status === "dlq";
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.template_name}</code>
                      </td>
                      <td className="py-2">{r.recipient_email}</td>
                      <td className="py-2">
                        <Badge variant="outline" className={statusColor(r.status)}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground max-w-[280px] truncate" title={r.error_message ?? ""}>
                        {r.error_message ?? "—"}
                      </td>
                      <td className="py-2 text-right">
                        {isFailed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(r.message_id)}
                            disabled={retrying === r.message_id}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${retrying === r.message_id ? "animate-spin" : ""}`} />
                            Réessayer
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > 50 && (
            <div className="flex justify-between items-center pt-4 text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} / {totalPages} — {total} emails
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Précédent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

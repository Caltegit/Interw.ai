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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Send, RefreshCw, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { EditRecoveryTemplateDialog } from "@/components/superadmin/EditRecoveryTemplateDialog";

type Impacted = {
  session_id: string;
  created_at: string;
  candidate_name: string;
  candidate_email: string;
  project_id: string;
  project_title: string;
  organization_name: string;
  session_status: string;
  reinvitation_id: string | null;
  reinvitation_sent_at: string | null;
  reinvitation_status: string | null;
  new_session_id: string | null;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// Domaine public réel envoyé aux candidats — jamais l'URL de preview Lovable.
const PUBLIC_APP_URL = "https://interw.ai";
function candidateUrl(slug: string, token: string) {
  return `${PUBLIC_APP_URL}/session/${slug}/start/${token}`;
}

export default function AdminCandidatesToRecover() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Impacted[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todo" | "sent" | "all">("todo");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [singleConfirm, setSingleConfirm] = useState<Impacted | null>(null);
  const [sending, setSending] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);

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
    const { data, error } = await (supabase.rpc as any)("admin_list_impacted_candidates");
    if (error) {
      const timeout = error.message?.toLowerCase().includes("timeout");
      const message = timeout
        ? "Le listing a expiré côté base. La requête a été optimisée, relancez le chargement."
        : error.message;
      setRows([]);
      setLoadError(message);
      toast({ title: "Chargement impossible", description: message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Impacted[]);
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

  // Poll live des témoins toutes les 5 s
  useEffect(() => {
    if (witnesses.length === 0) return;
    const iv = setInterval(async () => {
      const ids = witnesses.map((w) => w.session_id);
      const { data: sess } = await supabase
        .from("sessions")
        .select("id, status")
        .in("id", ids);
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

  const filtered = useMemo(() => {
    if (filter === "todo") return rows.filter((r) => !r.reinvitation_sent_at);
    if (filter === "sent") return rows.filter((r) => !!r.reinvitation_sent_at);
    return rows;
  }, [rows, filter]);

  const selectedRows = filtered.filter((r) => selected[r.session_id] && !r.reinvitation_sent_at);

  async function sendOne(row: Impacted, isWitness = false) {
    const { data, error } = await supabase.functions.invoke("resend-impacted-candidate", {
      body: { original_session_id: row.session_id, is_witness: isWitness },
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
      await sendOne(singleConfirm);
      toast({ title: "Invitation envoyée", description: singleConfirm.candidate_email });
      setSingleConfirm(null);
      await loadImpacted();
    } catch (e: any) {
      toast({ title: "Échec", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleBulk() {
    setSending(true);
    let ok = 0;
    let ko = 0;
    for (const r of selectedRows) {
      try {
        await sendOne(r);
        ok++;
      } catch (e: any) {
        ko++;
        toast({ title: `Échec ${r.candidate_email}`, description: e.message, variant: "destructive" });
      }
    }
    toast({ title: "Campagne terminée", description: `${ok} envoyé(s), ${ko} échec(s)` });
    setBulkOpen(false);
    setSelected({});
    setSending(false);
    await loadImpacted();
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
      await sendOne(
        {
          session_id: w.session_id,
          created_at: "",
          candidate_name: w.candidate_name,
          candidate_email: w.candidate_email,
          project_id: "",
          project_title: "",
          organization_name: "",
          session_status: w.status,
          reinvitation_id: null,
          reinvitation_sent_at: null,
          reinvitation_status: null,
          new_session_id: null,
        },
        true,
      );
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
          Régression d'upload du 8 au 15 juillet 2026 — récupération manuelle des candidats impactés.
        </p>
      </div>

      {/* Zone A — Témoins */}
      <Card>
        <CardHeader>
          <CardTitle>Tester avant d'envoyer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créez une ou plusieurs sessions témoins pour vérifier que l'upload fonctionne réellement,
            avant de lancer la campagne.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Nom témoin"
              value={wName}
              onChange={(e) => setWName(e.target.value)}
            />
            <Input
              placeholder="E-mail témoin"
              type="email"
              value={wEmail}
              onChange={(e) => setWEmail(e.target.value)}
            />
            <Select value={wProjectId} onValueChange={setWProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Projet" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} — {p.organization_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={createWitness} disabled={creatingWitness}>
              Créer session témoin
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Les liens pointent vers <code>interw.ai</code> — domaine réel envoyé aux candidats.
          </p>

          {witnesses.length > 0 && (
            <div className="space-y-2">
              {witnesses.map((w) => {
                const url = candidateUrl(w.project_slug, w.token);
                const ok = w.n_real_files > 0;
                return (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm"
                  >
                    <div className="flex-1 min-w-[220px]">
                      <div className="font-medium">
                        {w.candidate_name} — {w.candidate_email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Statut : <Badge variant="outline">{w.status}</Badge>{" "}
                        · {w.n_real_files} fichier(s) média réels
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(url, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir
                    </Button>
                    <Button size="sm" onClick={() => sendWitnessInvite(w)}>
                      <Send className="h-3 w-3 mr-1" /> Envoyer l'invitation
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone B — Campagne */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Candidats impactés ({rows.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sessions avec réponses candidat mais aucun média enregistré côté serveur.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditTemplateOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Modifier le modèle
            </Button>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">À renvoyer</SelectItem>
                <SelectItem value="sent">Déjà renvoyés</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadImpacted}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              disabled={selectedRows.length === 0}
              onClick={() => setBulkOpen(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Renvoyer à {selectedRows.length || 0}
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
            <p className="text-muted-foreground">Aucun candidat pour ce filtre.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Renvoyé</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const sent = !!r.reinvitation_sent_at;
                  return (
                    <TableRow key={r.session_id}>
                      <TableCell>
                        {!sent && (
                          <Checkbox
                            checked={!!selected[r.session_id]}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [r.session_id]: v === true }))
                            }
                          />
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
                        <Badge variant="outline">{r.session_status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {sent ? (
                          <span className="text-green-700">
                            {formatDate(r.reinvitation_sent_at!)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {sent ? (
                          <Badge className="bg-green-100 text-green-800">Envoyé</Badge>
                        ) : (
                          <Button size="sm" onClick={() => setSingleConfirm(r)}>
                            Renvoyer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm single */}
      <Dialog open={!!singleConfirm} onOpenChange={(o) => !o && setSingleConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renvoyer une invitation</DialogTitle>
            <DialogDescription>
              Une nouvelle session sera créée et un e-mail sera envoyé à{" "}
              <strong>{singleConfirm?.candidate_email}</strong> ({singleConfirm?.candidate_name}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleConfirm(null)}>
              Annuler
            </Button>
            <Button onClick={handleSingle} disabled={sending}>
              {sending ? "Envoi…" : "Confirmer et envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm bulk */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Renvoyer à {selectedRows.length} candidats</DialogTitle>
            <DialogDescription>
              Chaque candidat recevra un e-mail d'excuse avec un nouveau lien d'entretien
              valable 7 jours.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-md border p-3 space-y-1 text-sm">
            {selectedRows.map((r) => (
              <div key={r.session_id} className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{r.candidate_name}</span>
                <span className="text-muted-foreground">— {r.candidate_email}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleBulk} disabled={sending}>
              {sending ? "Envoi en cours…" : `Envoyer à ${selectedRows.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditRecoveryTemplateDialog
        open={editTemplateOpen}
        onOpenChange={setEditTemplateOpen}
      />
    </div>
  );
}

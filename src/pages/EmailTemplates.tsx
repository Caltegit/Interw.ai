import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Pencil, RotateCcw, Loader2 } from "lucide-react";

interface TemplateDefault {
  key: string;
  group: "auth" | "transactional";
  displayName: string;
  subject: string;
  html: string;
  variables: string[];
  sampleProps: Record<string, any>;
}

interface OverrideRow {
  template_key: string;
  subject: string;
  html_body: string;
  enabled: boolean;
}

export default function EmailTemplates() {
  const { isAdmin, organizationId, loading: roleLoading } = useOrgRole();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateDefault[]>([]);
  const [overrides, setOverrides] = useState<Record<string, OverrideRow>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateDefault | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin || !organizationId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [{ data: defaults, error: fnError }, { data: ovs, error: ovError }] = await Promise.all([
          supabase.functions.invoke("get-email-template-defaults"),
          supabase
            .from("email_template_overrides" as never)
            .select("template_key, subject, html_body, enabled")
            .eq("organization_id", organizationId),
        ]);
        if (fnError) throw fnError;
        if (ovError) throw ovError;
        setTemplates((defaults as any)?.templates || []);
        const map: Record<string, OverrideRow> = {};
        ((ovs as any[]) || []).forEach((o) => (map[o.template_key] = o));
        setOverrides(map);
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, organizationId, roleLoading, toast]);

  const grouped = useMemo(() => {
    const auth = templates.filter((t) => t.group === "auth");
    const tx = templates.filter((t) => t.group === "transactional");
    return { auth, tx };
  }, [templates]);

  const openEditor = (tpl: TemplateDefault) => {
    const ov = overrides[tpl.key];
    setEditing(tpl);
    setEditSubject(ov?.subject || tpl.subject);
    setEditBody(ov?.html_body || tpl.html);
  };

  const closeEditor = () => {
    setEditing(null);
    setEditSubject("");
    setEditBody("");
  };

  const insertVar = (v: string) => {
    setEditBody((b) => b + `{{${v}}}`);
  };

  const save = async () => {
    if (!editing || !organizationId) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { error } = await supabase
      .from("email_template_overrides" as never)
      .upsert(
        {
          organization_id: organizationId,
          template_key: editing.key,
          subject: editSubject,
          html_body: editBody,
          enabled: true,
          updated_by: userId,
        },
        { onConflict: "organization_id,template_key" }
      );
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setOverrides((prev) => ({
      ...prev,
      [editing.key]: { template_key: editing.key, subject: editSubject, html_body: editBody, enabled: true },
    }));
    toast({ title: "Enregistré", description: "Template personnalisé mis à jour." });
    closeEditor();
  };

  const resetToDefault = async () => {
    if (!editing || !organizationId) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_template_overrides" as never)
      .delete()
      .eq("organization_id", organizationId)
      .eq("template_key", editing.key);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setOverrides((prev) => {
      const n = { ...prev };
      delete n[editing.key];
      return n;
    });
    toast({ title: "Réinitialisé", description: "Le template par défaut sera utilisé." });
    closeEditor();
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Cette page est réservée aux administrateurs de l'organisation.
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderRow = (tpl: TemplateDefault) => {
    const customized = !!overrides[tpl.key];
    return (
      <div
        key={tpl.key}
        className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{tpl.displayName}</div>
            <div className="text-xs text-muted-foreground">{tpl.subject}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={customized ? "default" : "secondary"}>
            {customized ? "Personnalisé" : "Défaut"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => openEditor(tpl)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Modifier
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Emails</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personnalisez les emails envoyés par la plateforme. Utilisez les variables{" "}
          <code className="text-xs bg-muted px-1 rounded">{`{{nom}}`}</code> pour insérer des données dynamiques.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authentification</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {grouped.auth.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Aucun template.</div>
          ) : (
            grouped.auth.map(renderRow)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications application</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {grouped.tx.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Aucun template transactionnel enregistré pour l'instant.
            </div>
          ) : (
            grouped.tx.map(renderRow)
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier — {editing?.displayName}</DialogTitle>
            <DialogDescription>
              Édition du sujet et du corps HTML. L'aperçu se met à jour en direct.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col gap-3 min-h-0">
              <div>
                <Label htmlFor="email-subject">Sujet</Label>
                <Input
                  id="email-subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>

              {editing && editing.variables.length > 0 && (
                <div>
                  <Label className="text-xs">Variables disponibles</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {editing.variables.map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => insertVar(v)}
                      >
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col min-h-0">
                <Label htmlFor="email-body">Corps HTML</Label>
                <Textarea
                  id="email-body"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="font-mono text-xs flex-1 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <Label className="mb-1">Aperçu</Label>
              <iframe
                title="preview"
                sandbox=""
                srcDoc={editBody}
                className="flex-1 w-full border rounded bg-white"
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2">
            {editing && overrides[editing.key] && (
              <Button variant="outline" onClick={resetToDefault} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Réinitialiser
              </Button>
            )}
            <Button variant="ghost" onClick={closeEditor} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

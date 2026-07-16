import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw } from "lucide-react";

const TEMPLATE_KEY = "candidate-recovery-invite";
const MAX_LEN = 4000;

const DEFAULT_SUBJECT = "Nous vous invitons à repasser votre entretien";
const DEFAULT_INTRO = `<p>Bonjour {prenom},</p>
<p>Suite à un incident technique survenu entre le 9 et le 15 juillet, votre entretien pour «&nbsp;<strong>{poste}</strong>&nbsp;» chez <strong>{entreprise}</strong> n'a pas pu être enregistré. Nous en sommes sincèrement désolés.</p>
<p>Nous vous invitons à le repasser via le lien ci-dessous. Vous disposez de 7&nbsp;jours.</p>`;
const DEFAULT_OUTRO = `<p>Si vous rencontrez la moindre difficulté, répondez à cet e-mail — nous vous accompagnons.</p>
<p>L'équipe Interw</p>`;

const SAMPLE = { prenom: "Camille", poste: "Office Manager", entreprise: "Acme" };

function substitute(tpl: string) {
  return tpl.replace(/\{(prenom|poste|entreprise)\}/g, (_, k) => (SAMPLE as any)[k]);
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
};

export function EditRecoveryTemplateDialog({ open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [intro, setIntro] = useState(DEFAULT_INTRO);
  const [outro, setOutro] = useState(DEFAULT_OUTRO);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("global_email_template_overrides")
        .select("subject, intro_html, outro_html")
        .eq("template_key", TEMPLATE_KEY)
        .maybeSingle();
      if (data) {
        setHasOverride(true);
        setSubject(data.subject || DEFAULT_SUBJECT);
        setIntro(data.intro_html || DEFAULT_INTRO);
        setOutro(data.outro_html || DEFAULT_OUTRO);
      } else {
        setHasOverride(false);
        setSubject(DEFAULT_SUBJECT);
        setIntro(DEFAULT_INTRO);
        setOutro(DEFAULT_OUTRO);
      }
      setLoading(false);
    })();
  }, [open]);

  async function handleSave() {
    if (!subject.trim()) {
      toast({ title: "Le sujet est requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const payload = {
      template_key: TEMPLATE_KEY,
      subject: subject.trim().slice(0, 500),
      intro_html: intro.slice(0, MAX_LEN),
      outro_html: outro.slice(0, MAX_LEN),
      updated_by: userRes.user?.id ?? null,
    };
    const { error } = await supabase
      .from("global_email_template_overrides")
      .upsert(payload, { onConflict: "template_key" });
    setSaving(false);
    if (error) {
      toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modèle enregistré" });
    onSaved?.();
    onOpenChange(false);
  }

  async function handleReset() {
    setSaving(true);
    const { error } = await supabase
      .from("global_email_template_overrides")
      .delete()
      .eq("template_key", TEMPLATE_KEY);
    setSaving(false);
    if (error) {
      toast({ title: "Réinitialisation impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modèle réinitialisé" });
    setHasOverride(false);
    setSubject(DEFAULT_SUBJECT);
    setIntro(DEFAULT_INTRO);
    setOutro(DEFAULT_OUTRO);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le modèle d'e-mail</DialogTitle>
          <DialogDescription>
            Ce contenu s'applique à tous les envois « Reprise entretien » (unitaires, groupés et témoins).
            Variables disponibles : <code>{"{prenom}"}</code>, <code>{"{poste}"}</code>, <code>{"{entreprise}"}</code>.
            Balises autorisées : <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;br&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;a&gt;</code>.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  value={subject}
                  maxLength={500}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="intro">Message d'introduction (avant le bouton)</Label>
                <Textarea
                  id="intro"
                  rows={8}
                  value={intro}
                  maxLength={MAX_LEN}
                  onChange={(e) => setIntro(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">{intro.length} / {MAX_LEN}</p>
              </div>
              <div>
                <Label htmlFor="outro">Message de clôture (après le bouton)</Label>
                <Textarea
                  id="outro"
                  rows={6}
                  value={outro}
                  maxLength={MAX_LEN}
                  onChange={(e) => setOutro(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">{outro.length} / {MAX_LEN}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aperçu</Label>
              <div className="rounded-md border bg-white p-6 text-sm">
                <div className="pb-3 mb-4 border-b">
                  <div className="text-lg font-bold text-indigo-600">Interw</div>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  <span className="font-medium">Sujet :</span> {subject || <em>(vide)</em>}
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Nous vous invitons à repasser votre entretien</h2>
                <div
                  className="text-gray-700 leading-relaxed mb-4 [&_p]:mb-3"
                  dangerouslySetInnerHTML={{ __html: substitute(intro) }}
                />
                <div className="text-center my-6">
                  <span className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded-md text-sm">
                    Repasser l'entretien
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                  <span className="text-indigo-600 break-all">https://interw.ai/session/…</span>
                </p>
                <div
                  className="text-gray-700 leading-relaxed [&_p]:mb-3"
                  dangerouslySetInnerHTML={{ __html: substitute(outro) }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                L'en-tête, le bouton, le lien de secours et l'encart légal ne sont pas modifiables.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasOverride || saving || loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser au texte d'origine
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, ShieldCheck, Sparkles } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const CONNECTOR_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/mcp`;

const CAPABILITIES = [
  "Lister vos postes de recrutement",
  "Lister les candidats d'un poste",
  "Lire le rapport d'évaluation d'un entretien",
  "Lire la transcription d'un entretien",
];

const CLAUDE_STEPS = [
  "Ouvrez Claude, puis Réglages.",
  "Allez dans Connecteurs, puis Ajouter un connecteur personnalisé.",
  "Collez l'adresse ci-dessus et validez.",
  "Connectez-vous avec votre compte Interw.",
  "Cliquez sur Autoriser sur l'écran de confirmation.",
];

const CHATGPT_STEPS = [
  "Ouvrez ChatGPT, puis Paramètres.",
  "Allez dans Applications et connecteurs, puis Créer.",
  "Collez l'adresse ci-dessus et validez.",
  "Connectez-vous avec votre compte Interw.",
  "Cliquez sur Autoriser sur l'écran de confirmation.",
];

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
      {steps.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

export default function SettingsMcp() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONNECTOR_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copie impossible", description: "Sélectionnez l'adresse et copiez-la manuellement.", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Connexion IA</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Branchez Claude ou ChatGPT sur Interw
          </CardTitle>
          <CardDescription>
            Votre assistant pourra consulter vos postes, vos candidats et leurs rapports. Chacun se connecte avec son
            propre compte et ne voit que ses propres données.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input readOnly value={CONNECTOR_URL} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button onClick={copy} variant="outline" className="shrink-0">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comment faire</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="claude">
            <AccordionItem value="claude">
              <AccordionTrigger>Avec Claude</AccordionTrigger>
              <AccordionContent>
                <Steps steps={CLAUDE_STEPS} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="chatgpt">
              <AccordionTrigger>Avec ChatGPT</AccordionTrigger>
              <AccordionContent>
                <Steps steps={CHATGPT_STEPS} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ce que votre assistant pourra faire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {CAPABILITIES.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {c}
              </li>
            ))}
          </ul>
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Exemple de question : « Donne-moi la synthèse des candidats du poste Commercial. »
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>L'assistant est en lecture seule : il ne peut rien modifier ni supprimer dans Interw.</p>
          <p>L'autorisation est révocable à tout moment depuis les réglages de Claude ou de ChatGPT.</p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AiTextCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  defaultText: string;
  value: string;
  variables: { token: string; description: string }[];
  onSave: (text: string) => void;
}

export function AiTextCustomizerDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultText,
  value,
  variables,
  onSave,
}: AiTextCustomizerDialogProps) {
  const [text, setText] = useState(value || defaultText);

  useEffect(() => {
    if (open) setText(value || defaultText);
  }, [open, value, defaultText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={defaultText}
          />

          {variables.length > 0 && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <p className="font-medium mb-2">Variables disponibles</p>
              <ul className="space-y-1">
                {variables.map((v) => (
                  <li key={v.token} className="flex items-start gap-2">
                    <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
                      {v.token}
                    </code>
                    <span className="text-muted-foreground">{v.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setText(defaultText)}>
            Réinitialiser
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onSave(text.trim());
              onOpenChange(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const DEFAULT_AI_INTRO_TEXT =
  "Bonjour {prenom}, nous allons démarrer la session, voici la première question : {question_suivante}";

export const DEFAULT_AI_TRANSITION_TEXT = "Merci. Passons à la question suivante.";

/**
 * Remplace les variables {prenom}, {poste}, {question_suivante} dans un template.
 */
export function interpolateAiText(
  template: string,
  vars: { prenom?: string; poste?: string; question_suivante?: string },
): string {
  return template
    .replace(/\{prenom\}/g, vars.prenom ?? "")
    .replace(/\{poste\}/g, vars.poste ?? "")
    .replace(/\{question_suivante\}/g, vars.question_suivante ?? "")
    .trim();
}

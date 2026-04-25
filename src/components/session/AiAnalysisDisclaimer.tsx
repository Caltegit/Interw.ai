import { Info } from "lucide-react";

export function AiAnalysisDisclaimer() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">Analyse assistée par IA — à valider par un humain</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Les analyses ci-dessous (personnalité, soft skills, signaux faibles, motivation) sont générées
          automatiquement à partir de la transcription. Elles constituent une aide à la décision et ne doivent
          jamais être l'unique critère de sélection. Conformément au RGPD et à l'AI Act, toute décision de
          recrutement doit être prise par un recruteur humain.
        </p>
      </div>
    </div>
  );
}

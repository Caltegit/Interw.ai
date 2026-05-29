import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewDemoEnd() {
  return (
    <CandidateLayout>
      <div className="w-full max-w-xl animate-fade-in">
        <Card>
          <CardContent className="py-12 space-y-6 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "hsl(var(--l-accent) / 0.15)" }}
            >
              <CheckCircle2 className="h-7 w-7" style={{ color: "hsl(var(--l-accent))" }} />
            </div>
            <h1 className="text-2xl font-bold candidate-gradient-text">Démo terminée</h1>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--l-fg) / 0.8)" }}>
              Aucun enregistrement n'a été effectué. Si vous souhaitez simuler
              en tant que candidat, utilisez le « lien candidat ».
            </p>
            <p className="text-xs" style={{ color: "hsl(var(--l-fg) / 0.55)" }}>
              Vous pouvez fermer cet onglet.
            </p>
          </CardContent>
        </Card>
      </div>
    </CandidateLayout>
  );
}

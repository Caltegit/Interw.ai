import CandidateLayout from "@/components/CandidateLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function InterviewCancelled() {
  return (
    <CandidateLayout>
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold">Session annulée</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre session a été annulée. Toutes vos données — vidéo, audio, transcription et analyse — ont été
              définitivement supprimées de nos serveurs.
            </p>
            <p className="text-xs text-muted-foreground">
              Vous pouvez fermer cette fenêtre.
            </p>
          </CardContent>
        </Card>
      </div>
    </CandidateLayout>
  );
}

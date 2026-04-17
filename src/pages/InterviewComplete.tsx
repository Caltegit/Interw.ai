import { CheckCircle, Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewComplete() {
  const { token } = useParams();

  return (
    <CandidateLayout>
      <div className="animate-fade-in">
        <Card className="max-w-md w-full text-center overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4ade80, #22c55e, #4ade80)" }} />
          <CardContent className="py-14 space-y-6">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center animate-scale-in">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: "#4ade80" }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
              >
                <CheckCircle className="h-10 w-10" style={{ color: "#4ade80" }} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Entretien terminé, merci !</h1>
              <p style={{ color: "rgba(245, 240, 232, 0.65)" }}>&nbsp;</p>
            </div>
            <div
              className="flex items-center justify-center gap-2 text-sm"
              style={{ color: "rgba(245, 240, 232, 0.4)" }}
            >
              <Sparkles className="h-4 w-4" />
              <span>Les meilleures équipes ne se recrutent pas. Elles se reconnaissent.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </CandidateLayout>
  );
}

import { CheckCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewComplete() {
  const { token } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="py-12 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-xl font-bold">Entretien terminé, merci !</h1>
          <p className="text-muted-foreground">
            Vos réponses ont été enregistrées. L'équipe de recrutement vous contactera prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

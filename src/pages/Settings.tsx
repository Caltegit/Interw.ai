import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <Card>
        <CardHeader><CardTitle>Organisation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Les paramètres d'organisation seront disponibles prochainement.</p>
        </CardContent>
      </Card>
    </div>
  );
}

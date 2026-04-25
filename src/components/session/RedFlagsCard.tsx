import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface RedFlag {
  type?: string;
  severity?: "low" | "medium" | "high";
  description: string;
  evidence?: string;
}

const severityLabel: Record<string, string> = {
  low: "Faible",
  medium: "Modéré",
  high: "Élevé",
};

const severityClass: Record<string, string> = {
  low: "border-warning/40 text-warning",
  medium: "border-warning text-warning",
  high: "border-destructive text-destructive",
};

export function RedFlagsCard({ flags }: { flags?: RedFlag[] | null }) {
  if (!flags || flags.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" /> Signaux à creuser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flags.map((f, i) => {
          const sev = f.severity ?? "medium";
          return (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{f.type || "Signal"}</span>
                <Badge variant="outline" className={severityClass[sev]}>
                  {severityLabel[sev]}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-foreground">{f.description}</p>
              {f.evidence && (
                <p className="mt-1 text-xs italic text-muted-foreground">Indice : « {f.evidence} »</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

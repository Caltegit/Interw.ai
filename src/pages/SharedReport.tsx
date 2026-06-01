import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectAverages } from "@/hooks/queries/useProjectAverages";
import { SessionReportView } from "@/components/session/SessionReportView";

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadReport = async () => {
      const storageKey = `report-share:${token}`;
      const storedSecret =
        typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;

      const { data, error: fnError } = await supabase.functions.invoke("consume-report-share", {
        body: { token, viewerSecret: storedSecret ?? undefined },
      });

      if (fnError || !data || (data as any).error) {
        setError((data as any)?.error ?? "Lien de partage introuvable ou expiré.");
        setLoading(false);
        return;
      }

      const issued = (data as any).viewerSecret;
      if (issued && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, issued);
      }

      setReport((data as any).report);
      setSession((data as any).session);
      setMessages((data as any).messages ?? []);
      setLoading(false);
    };

    loadReport();
  }, [token]);

  const { data: projectAverages } = useProjectAverages(session?.project_id);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return <p className="p-8">Session introuvable.</p>;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <SessionReportView
        session={session}
        report={report}
        messages={messages}
        projectAverages={projectAverages}
        readOnly
      />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Rapport partagé via un lien sécurisé · Généré par Interw.ai
      </p>
    </div>
  );
}

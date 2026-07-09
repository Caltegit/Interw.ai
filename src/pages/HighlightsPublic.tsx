import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HighlightReelPlayer, HighlightClip } from "@/components/session/HighlightReelPlayer";
import { Trophy, ExternalLink } from "lucide-react";

export default function HighlightsPublic() {
  const { token } = useParams();
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const storageKey = `report-share:${token}`;
      const storedSecret =
        typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;

      const { data, error: fnError } = await supabase.functions.invoke("consume-report-share", {
        body: { token, viewerSecret: storedSecret ?? undefined },
      });

      if (fnError || !data || (data as any).error) {
        setError((data as any)?.error ?? "Lien introuvable ou expiré.");
        setLoading(false);
        return;
      }

      const issued = (data as any).viewerSecret;
      if (issued && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, issued);
      }

      const report = (data as any).report;
      const session = (data as any).session;

      const list = (report?.highlight_clips as unknown as HighlightClip[]) ?? [];
      setClips(list);
      setCandidateName(session?.candidate_name ?? "");
      setProjectTitle(session?.projects?.title ?? "");
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Trophy className="h-4 w-4" /> Meilleurs moments
        </div>
        <h1 className="text-2xl font-bold">{candidateName}</h1>
        {projectTitle && <p className="text-muted-foreground">{projectTitle}</p>}
      </div>

      <HighlightReelPlayer clips={clips} />

      <div className="mt-6 text-center">
        <Button asChild variant="outline">
          <Link to={`/shared-report/${token}`}>
            Voir le rapport complet <ExternalLink className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Lien sécurisé · Généré par Interw
      </p>
    </div>
  );
}

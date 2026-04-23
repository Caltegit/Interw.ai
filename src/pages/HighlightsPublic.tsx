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
      const { data: share } = await supabase
        .from("report_shares")
        .select("report_id, is_active, expires_at")
        .eq("share_token", token)
        .maybeSingle();

      if (!share) {
        setError("Lien introuvable ou expiré.");
        setLoading(false);
        return;
      }
      if (!share.is_active) {
        setError("Ce lien a été désactivé.");
        setLoading(false);
        return;
      }
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        setError("Ce lien a expiré.");
        setLoading(false);
        return;
      }

      const { data: report } = await supabase
        .from("reports")
        .select("highlight_clips, session_id")
        .eq("id", share.report_id)
        .single();

      const list = (report?.highlight_clips as unknown as HighlightClip[]) ?? [];
      setClips(list);

      if (report?.session_id) {
        const { data: s } = await supabase
          .from("sessions")
          .select("candidate_name, projects(title)")
          .eq("id", report.session_id)
          .single();
        if (s) {
          setCandidateName(s.candidate_name ?? "");
          setProjectTitle((s as any).projects?.title ?? "");
        }
      }

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
        Lien sécurisé · Généré par Interw.ai
      </p>
    </div>
  );
}

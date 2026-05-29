import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewDemoLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!slug || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("id, organization_id, slug, status")
        .eq("slug", slug)
        .eq("status", "active")
        .single();
      if (!project) {
        setError("Ce projet n'est pas accessible.");
        return;
      }
      const { data: session, error: err } = await supabase
        .from("sessions")
        .insert({
          project_id: project.id,
          organization_id: project.organization_id,
          candidate_name: "Démo",
          candidate_email: "demo@interw.local",
          is_demo: true,
          consent_accepted_at: new Date().toISOString(),
        } as never)
        .select()
        .single();

      if (err || !session) {
        setError("Impossible de démarrer la démo. Réessayez.");
        return;
      }

      navigate(`/session/${slug}/start/${(session as any).token}`, { replace: true });
    })();
  }, [slug, navigate]);

  if (error) {
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <p className="text-lg font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </CandidateLayout>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}


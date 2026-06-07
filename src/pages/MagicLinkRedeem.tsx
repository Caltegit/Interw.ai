import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MagicLinkRedeem() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setError("Lien invalide.");
      return;
    }
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("redeem-magic-link", {
          body: { token },
        });
        if (cancelled) return;
        if (fnErr) {
          // Tente de récupérer le message renvoyé par la fonction
          const msg = (fnErr as { context?: { error?: string } })?.context?.error
            || (fnErr as Error).message
            || "Lien invalide ou expiré.";
          setError(msg);
          return;
        }
        const actionLink = (data as { action_link?: string; error?: string })?.action_link;
        if (!actionLink) {
          setError((data as { error?: string })?.error || "Lien invalide ou expiré.");
          return;
        }
        window.location.replace(actionLink);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Connexion en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Interw</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={() => navigate("/auth/magic-link")}>Recevoir un nouveau lien</Button>
          <Button variant="ghost" onClick={() => navigate("/login")}>Retour à la connexion</Button>
        </CardContent>
      </Card>
    </div>
  );
}

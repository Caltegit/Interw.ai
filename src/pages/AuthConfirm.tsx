import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type OtpType = "magiclink" | "recovery" | "signup" | "invite" | "email_change";

const TYPE_LABELS: Record<string, { title: string; cta: string; nextDefault: string }> = {
  magiclink: { title: "Confirmer ma connexion", cta: "Me connecter", nextDefault: "/dashboard" },
  recovery: { title: "Réinitialiser mon mot de passe", cta: "Continuer", nextDefault: "/reset-password" },
  signup: { title: "Confirmer mon adresse", cta: "Confirmer", nextDefault: "/dashboard" },
  invite: { title: "Accepter l'invitation", cta: "Accepter", nextDefault: "/dashboard" },
  email_change: { title: "Confirmer ma nouvelle adresse", cta: "Confirmer", nextDefault: "/settings" },
};

export default function AuthConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tokenHash = params.get("token_hash");
  const type = (params.get("type") || "magiclink") as OtpType;
  const next = params.get("next") || TYPE_LABELS[type]?.nextDefault || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Erreur Supabase passée dans le hash (#error=...&error_code=otp_expired)
  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;
    const p = new URLSearchParams(hash);
    const err = p.get("error_description") || p.get("error");
    if (err) setError(decodeURIComponent(err.replace(/\+/g, " ")));
  }, []);

  const labels = useMemo(() => TYPE_LABELS[type] || TYPE_LABELS.magiclink, [type]);

  const handleConfirm = async () => {
    if (!tokenHash) {
      setError("Lien invalide.");
      return;
    }
    setLoading(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        type: type as never,
        token_hash: tokenHash,
      });
      if (verifyErr) throw verifyErr;
      navigate(next, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lien invalide ou expiré.";
      setError(msg);
      toast({ title: "Échec", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Interw</CardTitle>
          <CardDescription>
            {error
              ? "Ce lien a expiré ou a déjà été utilisé."
              : `${labels.title} en un clic.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Demandez un nouveau lien pour continuer.
              </p>
              <Button onClick={() => navigate("/auth/magic-link")}>Recevoir un nouveau lien</Button>
              <Button variant="ghost" onClick={() => navigate("/login")}>Retour à la connexion</Button>
            </>
          ) : (
            <>
              <Button onClick={handleConfirm} disabled={loading || !tokenHash}>
                {loading ? "Vérification…" : labels.cta}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Cette étape supplémentaire protège votre compte contre les filtres anti-spam
                qui ouvrent automatiquement les liens reçus par email.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success) setState("done");
      else if ((data as any)?.reason === "already_unsubscribed") setState("already");
      else throw new Error("Désinscription échouée");
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur");
      setState("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Interw.ai</CardTitle>
          <CardDescription>Gestion de tes préférences email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state === "loading" && (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirme que tu ne souhaites plus recevoir d'emails de notre part.
              </p>
              <Button className="w-full" onClick={confirm}>
                Confirmer la désinscription
              </Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {state === "done" && (
            <div className="space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <p className="font-medium">Tu as été désinscrit avec succès.</p>
              <p className="text-sm text-muted-foreground">
                Tu ne recevras plus d'emails de notre part.
              </p>
            </div>
          )}
          {state === "already" && (
            <div className="space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Déjà désinscrit</p>
              <p className="text-sm text-muted-foreground">
                Cette adresse n'est plus inscrite à nos emails.
              </p>
            </div>
          )}
          {state === "invalid" && (
            <div className="space-y-3">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="font-medium">Lien invalide ou expiré</p>
              <p className="text-sm text-muted-foreground">
                Ce lien de désinscription n'est plus valable.
              </p>
            </div>
          )}
          {state === "error" && (
            <div className="space-y-3">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="font-medium">Erreur</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

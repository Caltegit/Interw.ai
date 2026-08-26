import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeEmail } from "@/lib/auth-utils";

export default function Login() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { t } = useTranslation("common");

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);
    try {
      if (mode === "forgot") {
        // Envoie un email contenant un code à 6 chiffres généré par le backend.
        const { error } = await supabase.functions.invoke("request-password-reset-code", {
          body: { email: normalizedEmail },
        });
        // On ne révèle jamais l'existence du compte : succès affiché même en cas d'erreur
        if (error) {
          // Log silencieux, mais on continue vers la page de saisie du code
          console.warn("request-password-reset-code:", error.message);
        }
        toast({
          title: "Code envoyé",
          description: "Si un compte existe pour cette adresse, vous recevez un code à 6 chiffres.",
        });
        navigate(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
            {mode === "forgot" ? "Réinitialisation du mot de passe" : "CONNEXION"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === "login" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {mode === "forgot" && (
              <p className="text-xs text-muted-foreground">
                Vous recevrez un code à 6 chiffres par email pour vous connecter.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Chargement..."
                : mode === "forgot"
                  ? "Envoyer le code"
                  : t("actions.signIn")}
            </Button>
            {mode === "forgot" && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode("login")}
                disabled={loading}
              >
                Retour à la connexion
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

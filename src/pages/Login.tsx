import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeEmail } from "@/lib/auth-utils";

export default function Login() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSentDialog, setShowSentDialog] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/reset-password`,
        });
        if (error) throw error;
        setSentToEmail(normalizedEmail);
        setShowSentDialog(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: normalizedEmail, 
          password 
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Chargement..."
                : mode === "forgot"
                  ? "Envoyer le lien"
                  : "Se connecter"}
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

      <AlertDialog open={showSentDialog} onOpenChange={setShowSentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vérifiez votre boîte mail</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Si un compte existe pour <strong>{sentToEmail}</strong>, vous allez recevoir un email contenant un{" "}
                  <strong>lien de réinitialisation</strong>. 
                </p>
                <p>Cliquez dessus pour choisir un nouveau mot de passe et accéder à votre compte.</p>
                <p>
                  <strong>Pensez à vérifier vos spams</strong> si vous ne voyez pas l'email d'ici quelques minutes.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowSentDialog(false);
                setMode("login");
              }}
            >
              J'ai compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

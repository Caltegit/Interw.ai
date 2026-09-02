import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { t } = useTranslation("auth");

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
          console.warn("request-password-reset-code:", error.message);
        }
        toast({
          title: t("login.codeSent"),
          description: t("login.codeSentDesc"),
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
      toast({ title: t("login.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="px-6 py-5">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Interw
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "forgot" ? t("login.forgotTitle") : t("login.title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "forgot" ? t("login.forgotSubtitle") : t("login.subtitle")}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode === "login" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                  >
                    {t("login.forgot")}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? t("login.loading")
                : mode === "forgot"
                  ? t("login.sendCode")
                  : t("login.submit")}
            </Button>
            {mode === "forgot" && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode("login")}
                disabled={loading}
              >
                {t("login.backToLogin")}
              </Button>
            )}
          </form>
          {mode === "login" && (
            <p className="text-muted-foreground mt-6 text-center text-sm">
              {t("login.noAccount")}{" "}
              <Link to="/signup" className="text-foreground font-medium underline underline-offset-4">
                {t("login.createAccount")}
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

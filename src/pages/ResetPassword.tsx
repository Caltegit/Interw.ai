import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { normalizeEmail } from "@/lib/auth-utils";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const parseErrorMessage = (raw: unknown): string => {
    const msg = raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "";
    if (/expired|expiré/i.test(msg)) return "Ce code a expiré. Demandez-en un nouveau.";
    if (/incorrect|invalid|invalide/i.test(msg)) return "Code incorrect. Vérifiez les 6 chiffres saisis.";
    if (/attempts|tentatives/i.test(msg)) return "Trop de tentatives. Demandez un nouveau code.";
    return msg || "Code incorrect ou expiré. Demandez un nouveau code.";
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setErrorMessage("Renseignez votre adresse email.");
      return;
    }
    if (code.length !== 6) {
      setErrorMessage("Saisissez les 6 chiffres reçus par email.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("complete-password-reset", {
        body: { email: normalizedEmail, code },
      });
      if (error) throw error;
      const tokenHash = (data as { token_hash?: string } | null)?.token_hash;
      if (!tokenHash) throw new Error("Réponse invalide du serveur.");

      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: tokenHash,
      });
      if (verifyError) throw verifyError;

      toast({ title: "Connexion réussie", description: "Vous êtes maintenant connecté." });
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      const message = parseErrorMessage(e);
      setErrorMessage(message);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage(null);
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setErrorMessage("Renseignez votre adresse email.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke("request-password-reset-code", {
        body: { email: normalizedEmail },
      });
      if (error) console.warn("request-password-reset-code:", error.message);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
      toast({
        title: "Code renvoyé",
        description: "Si un compte existe, un nouveau code vient d'être envoyé.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Connexion par code</CardTitle>
          <CardDescription>
            Saisissez le code à 6 chiffres reçu par email pour vous connecter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Code à 6 chiffres</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resending || resendCooldown > 0}
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {resending
                  ? "Envoi..."
                  : resendCooldown > 0
                    ? `Renvoyer dans ${resendCooldown}s`
                    : "Renvoyer le code"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:underline"
              >
                Retour à la connexion
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification du code...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

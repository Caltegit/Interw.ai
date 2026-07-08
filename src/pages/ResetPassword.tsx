import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { normalizeEmail, validatePassword } from "@/lib/auth-utils";

type Step = "code" | "password";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("code");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Si l'utilisateur arrive déjà en session recovery (ancien lien magique), passer direct à l'étape mot de passe.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStep("password");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStep("password");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      toast({ title: "Email requis", description: "Renseignez votre adresse email.", variant: "destructive" });
      return;
    }
    if (code.length !== 6) {
      toast({ title: "Code invalide", description: "Saisissez les 6 chiffres reçus par email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: code,
        type: "recovery",
      });
      if (error) throw error;
      setStep("password");
    } catch (e: any) {
      toast({
        title: "Code incorrect ou expiré",
        description: e.message || "Vérifiez le code ou demandez-en un nouveau.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      toast({ title: "Email requis", description: "Renseignez votre adresse email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) console.warn("resetPasswordForEmail:", error.message);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast({
        title: "Code renvoyé",
        description: "Si un compte existe, un nouveau code vient d'être envoyé.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    const errorMsg = validatePassword(password);
    if (errorMsg) {
      toast({ title: "Mot de passe invalide", description: errorMsg, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Mot de passe mis à jour", description: "Vous êtes maintenant connecté." });
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            {step === "code" ? "Vérification du code" : "Nouveau mot de passe"}
          </CardTitle>
          <CardDescription>
            {step === "code"
              ? "Saisissez le code à 6 chiffres reçu par email."
              : "Choisissez un nouveau mot de passe pour votre compte."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "code" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
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
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
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
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? "Vérification..." : "Vérifier"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer le code"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-muted-foreground hover:underline"
                >
                  Retour à la connexion
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 caractères, avec au moins une lettre, un chiffre et un caractère spécial.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

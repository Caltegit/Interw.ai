import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeEmail, validatePassword } from "@/lib/auth-utils";
import { MailCheck } from "lucide-react";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "sent" | "existing">("form");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { t } = useTranslation("auth");

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({ title: t("signup.invalidPassword"), description: passwordError, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
          toast({ title: t("signup.existingTitle"), description: t("signup.existingDesc") });
          navigate("/login");
          return;
        }
        throw error;
      }
      setSent(true);
    } catch (error: any) {
      toast({ title: t("signup.error"), description: error.message, variant: "destructive" });
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
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-10 w-10" />
              <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t("signup.checkEmailTitle")}</h1>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t("signup.checkEmailDesc")} ({t("signup.checkEmailTo")} {normalizeEmail(email)})
              </p>
              <Button asChild className="mt-8 w-full">
                <Link to="/login">{t("signup.checkEmailAction")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight">{t("signup.title")}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{t("signup.subtitle")}</p>
              </div>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("signup.fullName")}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("signup.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("signup.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-muted-foreground text-xs">{t("signup.passwordHint")}</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("signup.loading") : t("signup.submit")}
                </Button>
              </form>
              <p className="text-muted-foreground mt-6 text-center text-sm">
                {t("signup.haveAccount")}{" "}
                <Link to="/login" className="text-foreground font-medium underline underline-offset-4">
                  {t("signup.signIn")}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

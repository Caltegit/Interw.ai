import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Invitation = { token: string; organization_name: string; expired: boolean };

export default function Onboarding() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [expiredInvitation, setExpiredInvitation] = useState<Invitation | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();

  // Si l'utilisateur est déjà rattaché à une organisation (invitation), on saute cette étape.
  // S'il a une invitation en attente, on l'accepte ; si elle est expirée, on bloque la création.
  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.organization_id) {
        navigate("/dashboard", { replace: true });
        return;
      }
      const { data } = await supabase.rpc("my_pending_invitation");
      const invitation = (data as Invitation[] | null)?.[0] ?? null;
      if (cancelled) return;
      if (invitation && !invitation.expired) {
        const { error } = await supabase.rpc("accept_invitation", {
          _token: invitation.token,
          _user_id: user.id,
        });
        if (!error) {
          await queryClient.invalidateQueries();
          navigate("/dashboard", { replace: true });
          return;
        }
      }
      if (invitation?.expired) setExpiredInvitation(invitation);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, navigate, queryClient]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("create_own_organization", { _name: orgName.trim() });
      if (error) {
        // Déjà rattaché entre-temps : on passe simplement au tableau de bord.
        if (error.message?.includes("déjà existante")) {
          navigate("/dashboard", { replace: true });
          return;
        }
        throw error;
      }
      await queryClient.invalidateQueries();
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({ title: t("onboarding.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="px-6 py-5">
        <span className="text-lg font-bold tracking-tight">Interw</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {checking ? (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : expiredInvitation ? (
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{t("onboarding.expiredTitle")}</h1>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t("onboarding.expiredDesc", { organization: expiredInvitation.organization_name })}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{t("onboarding.subtitle")}</p>
              </div>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">{t("onboarding.orgName")}</Label>
                  <Input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t("onboarding.orgNamePlaceholder")}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !orgName.trim()}>
                  {loading ? t("onboarding.loading") : t("onboarding.submit")}
                </Button>
              </form>
            </>
          )}
        </div>

      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Onboarding() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();

  // Si l'utilisateur est déjà rattaché à une organisation (invitation), on saute cette étape.
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.organization_id) navigate("/dashboard", { replace: true });
      });
  }, [session, navigate]);

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
        </div>
      </main>
    </div>
  );
}

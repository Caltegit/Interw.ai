import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Building2, ShieldAlert, Copy, ExternalLink } from "lucide-react";
import { OrgMembers } from "@/components/OrgMembers";
import { OrgLogoUpload } from "@/components/OrgLogoUpload";
import { useOrgRole } from "@/hooks/useOrgRole";
import { slugify, SLUG_REGEX } from "@/lib/slug";
import { useOrganization, useUpdateOrganization } from "@/hooks/queries/useOrganization";
import { PUBLIC_APP_HOST } from "@/lib/appUrl";

export default function SettingsOrganization() {
  const { toast } = useToast();
  const { isAdmin, organizationId: orgId, loading: roleLoading } = useOrgRole();

  const { data: org } = useOrganization(orgId);
  const updateOrg = useUpdateOrganization(orgId);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [initialSlug, setInitialSlug] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [orgInitialized, setOrgInitialized] = useState(false);

  useEffect(() => {
    if (org && !orgInitialized) {
      setOrgName(org.name);
      setOrgSlug(org.slug || "");
      setInitialSlug(org.slug || "");
      setOrgLogo(org.logo_url || null);
      setOrgInitialized(true);
    }
  }, [org, orgInitialized]);

  const handleSaveOrg = async () => {
    if (!orgId) return;
    const trimmedSlug = orgSlug.trim().toLowerCase();
    if (trimmedSlug && !SLUG_REGEX.test(trimmedSlug)) {
      toast({
        title: "Identifiant invalide",
        description: "Lettres minuscules, chiffres et tirets uniquement (2-60 caractères).",
        variant: "destructive",
      });
      return;
    }
    try {
      // Vérif unicité si changé
      if (trimmedSlug && trimmedSlug !== initialSlug) {
        const { data: existing } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", trimmedSlug)
          .neq("id", orgId)
          .maybeSingle();
        if (existing) {
          toast({ title: "Cet identifiant est déjà utilisé.", variant: "destructive" });
          return;
        }
      }
      await updateOrg.mutateAsync({ name: orgName, slug: trimmedSlug || initialSlug });
      setInitialSlug(trimmedSlug || initialSlug);
      toast({ title: "Organisation mise à jour !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const publicUrl = initialSlug ? `${window.location.origin}/o/${initialSlug}` : "";

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: "URL copiée !" });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mon organisation</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" /> Organisation
          </CardTitle>
          <CardDescription>
            {isAdmin ? "Gérez votre organisation" : "Informations de votre organisation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!roleLoading && !isAdmin && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Seuls les administrateurs peuvent modifier ces informations.</span>
            </div>
          )}
          <div>
            <Label>Nom de l'organisation</Label>
            <Input
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                if (isAdmin && !initialSlug) setOrgSlug(slugify(e.target.value));
              }}
              placeholder="Mon entreprise"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>Identifiant URL (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">{PUBLIC_APP_HOST}/o/</span>
              <Input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                placeholder="mon-entreprise"
                disabled={!isAdmin}
              />
            </div>
            {publicUrl && (
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {publicUrl} <ExternalLink className="h-3 w-3" />
                </a>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={copyPublicUrl}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          {orgId && (
            <OrgLogoUpload
              orgId={orgId}
              currentLogoUrl={orgLogo}
              canEdit={isAdmin}
              onUploaded={(url) => setOrgLogo(url)}
            />
          )}
          {isAdmin && (
            <Button onClick={handleSaveOrg} disabled={updateOrg.isPending} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {updateOrg.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </CardContent>
      </Card>

      {orgId && <OrgMembers orgId={orgId} />}
    </div>
  );
}

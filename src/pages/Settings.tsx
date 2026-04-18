import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, User, Building2, ShieldAlert, Copy, ExternalLink } from "lucide-react";
import { OrgMembers } from "@/components/OrgMembers";
import { OrgLogoUpload } from "@/components/OrgLogoUpload";
import { useOrgRole } from "@/hooks/useOrgRole";
import { slugify, SLUG_REGEX } from "@/lib/slug";

export default function Settings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { isAdmin, organizationId: orgId, loading: roleLoading } = useOrgRole();

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [initialSlug, setInitialSlug] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
  }, [profile]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("organizations").select("*").eq("id", orgId).single().then(({ data }) => {
      if (data) {
        setOrgName(data.name);
        setOrgSlug((data as any).slug || "");
        setInitialSlug((data as any).slug || "");
        setOrgLogo(data.logo_url || null);
      }
    });
  }, [orgId]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profil mis à jour !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Mot de passe modifié !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

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
    setSavingOrg(true);
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
          setSavingOrg(false);
          return;
        }
      }
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName, slug: trimmedSlug || initialSlug })
        .eq("id", orgId);
      if (error) throw error;
      setInitialSlug(trimmedSlug || initialSlug);
      toast({ title: "Organisation mise à jour !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingOrg(false);
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
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> Mon profil
          </CardTitle>
          <CardDescription>Modifiez vos informations personnelles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié.</p>
          </div>
          <div>
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {savingProfile ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" /> Mot de passe
          </CardTitle>
          <CardDescription>Changez votre mot de passe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 caractères" />
          </div>
          <div>
            <Label>Confirmer le mot de passe</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez le mot de passe" />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword} size="sm">
            <Lock className="mr-2 h-4 w-4" />
            {savingPassword ? "Modification..." : "Changer le mot de passe"}
          </Button>
        </CardContent>
      </Card>

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
              <span className="text-sm text-muted-foreground whitespace-nowrap">interw.ai/o/</span>
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
            <Button onClick={handleSaveOrg} disabled={savingOrg} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {savingOrg ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </CardContent>
      </Card>

      {orgId && <OrgMembers orgId={orgId} />}
    </div>
  );
}

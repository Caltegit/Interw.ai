import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, User, Building2 } from "lucide-react";

export default function Settings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Profile
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Organization
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Load organization info via function
    supabase.rpc("get_user_organization_id", { _user_id: user.id }).then(({ data: organizationId }) => {
      if (organizationId) {
        setOrgId(organizationId);
        supabase.from("organizations").select("*").eq("id", organizationId).single().then(({ data }) => {
          if (data) {
            setOrgName(data.name);
            setOrgLogo(data.logo_url || "");
          }
        });
      }
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      {/* Profile */}
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

      {/* Password */}
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

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" /> Organisation
          </CardTitle>
          <CardDescription>Informations de votre entreprise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nom de l'organisation</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Mon entreprise" />
          </div>
          <div>
            <Label>URL du logo</Label>
            <Input value={orgLogo} onChange={(e) => setOrgLogo(e.target.value)} placeholder="https://..." />
            {orgLogo && (
              <div className="mt-2">
                <img src={orgLogo} alt="Logo" className="h-12 rounded object-contain border border-border p-1" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            La gestion des membres de l'organisation sera disponible prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

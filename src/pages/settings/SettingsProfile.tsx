import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validatePassword } from "@/lib/auth-utils";
import { Save, Lock, User, Mic, Trash2, Play, Loader2 } from "lucide-react";
import { VoiceCloneDialog } from "@/components/settings/VoiceCloneDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateProfile } from "@/hooks/queries/useProfile";

export default function SettingsProfile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const updateProfile = useUpdateProfile(user?.id);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Voix clonée
  const [clonedVoice, setClonedVoice] = useState<{ id: string; name: string; created_at: string } | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [confirmDeleteVoice, setConfirmDeleteVoice] = useState(false);
  const [deletingVoice, setDeletingVoice] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("cloned_voice_id, cloned_voice_name, cloned_voice_created_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.cloned_voice_id) {
          setClonedVoice({
            id: data.cloned_voice_id,
            name: data.cloned_voice_name || "Ma voix",
            created_at: data.cloned_voice_created_at || "",
          });
        } else {
          setClonedVoice(null);
        }
        setVoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleDeleteVoice = async () => {
    setDeletingVoice(true);
    try {
      const { error } = await supabase.functions.invoke("delete-cloned-voice");
      if (error) throw error;
      setClonedVoice(null);
      toast({ title: "Voix supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setDeletingVoice(false);
      setConfirmDeleteVoice(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (!clonedVoice) return;
    setPreviewingVoice(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            preview: true,
            voiceId: clonedVoice.id,
            text: "Bonjour, je suis votre voix clonée. Voici un aperçu de mon timbre.",
          }),
        },
      );
      if (!res.ok) throw new Error("Échec de l'aperçu");
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setPreviewingVoice(false);
      await audio.play();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      setPreviewingVoice(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({ fullName });
      toast({ title: "Profil mis à jour !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    const errorMsg = validatePassword(newPassword);
    if (errorMsg) {
      toast({
        title: "Mot de passe invalide",
        description: errorMsg,
        variant: "destructive",
      });
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
      <h1 className="text-2xl font-bold">Mon profil</h1>

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
          <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" /> Mot de passe
          </CardTitle>
          <CardDescription>Au moins 6 caractères, un chiffre et un caractère spécial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Au moins 6 caractères, un chiffre et un caractère spécial" />
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
            <Mic className="h-5 w-5" /> Ma voix clonée
          </CardTitle>
          <CardDescription>
            Clonez votre voix pour l'utiliser comme voix de l'IA dans vos entretiens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : clonedVoice ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="font-medium">{clonedVoice.name}</p>
                {clonedVoice.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Créée le {new Date(clonedVoice.created_at).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handlePreviewVoice} disabled={previewingVoice}>
                  {previewingVoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Tester
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeleteVoice(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => setCloneDialogOpen(true)}>
              <Mic className="mr-2 h-4 w-4" /> Cloner ma voix
            </Button>
          )}
        </CardContent>
      </Card>

      <VoiceCloneDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        defaultName={profile?.full_name || "Ma voix"}
        onCloned={(id, name) =>
          setClonedVoice({ id, name, created_at: new Date().toISOString() })
        }
      />

      <AlertDialog open={confirmDeleteVoice} onOpenChange={setConfirmDeleteVoice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la voix clonée ?</AlertDialogTitle>
            <AlertDialogDescription>
              La voix sera définitivement supprimée d'ElevenLabs et ne pourra plus être utilisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingVoice}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVoice} disabled={deletingVoice}>
              {deletingVoice ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function InviteSignup() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, user } = useAuth();

  const [invitation, setInvitation] = useState<{ status: string; email: string } | null>(null);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Si déjà connecté : appel idempotent d'accept_invitation puis redirection
  useEffect(() => {
    if (user && invitation) {
      (async () => {
        try {
          await supabase.rpc("accept_invitation", {
            _token: token!,
            _user_id: user.id,
          });
          toast({ title: "Bienvenue !", description: `Vous avez rejoint ${orgName}` });
          navigate("/dashboard", { replace: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erreur";
          toast({ title: "Erreur", description: msg, variant: "destructive" });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invitation]);

  const loadInvitation = async () => {
    if (!token) {
      setError("Lien d'invitation invalide");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("organization_invitations")
      .select("*, organizations(name)")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (fetchError || !data) {
      setError("Cette invitation est invalide ou a expiré.");
      setLoading(false);
      return;
    }

    setInvitation({ status: data.status, email: data.email });
    setEmail(data.email);
    const org = (data as { organizations?: { name?: string } }).organizations;
    setOrgName(org?.name || "");
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, invitation_token: token },
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
        },
      });
      if (signUpError) throw signUpError;
      toast({
        title: "Compte créé",
        description: "Vérifiez votre email pour confirmer, puis revenez sur ce lien.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invitation invalide</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/login")}>Aller à la connexion</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Rejoindre {orgName}</CardTitle>
            <CardDescription>Vous êtes connecté. Finalisation en cours…</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Interw.ai</CardTitle>
          <CardDescription>
            Vous avez été ajouté à <strong>{orgName}</strong>. Définissez votre mot de passe pour vous connecter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">L'email est pré-rempli depuis l'invitation.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Création..." : "Créer mon compte"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary underline"
              onClick={() => navigate("/login")}
            >
              Déjà un compte ? Se connecter
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

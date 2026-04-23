import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface Props {
  organizationId: string;
  organizationName: string;
  onCreated: () => void;
}

export function CreateUserInOrgDialog({ organizationId, organizationName, onCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("recruiter");

  const reset = () => {
    setEmail(""); setFullName(""); setPassword(""); setRole("recruiter");
  };

  const handleCreate = async () => {
    if (!email.trim() || !fullName.trim() || !role) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("superadmin-manage-user", {
        body: {
          action: "create",
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          password: password || undefined,
          organization_id: organizationId,
          role,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const wasInvited = (data as { invited?: boolean })?.invited;
      toast({
        title: wasInvited ? "Invitation envoyée" : "Utilisateur créé",
        description: wasInvited ? `Un email d'invitation a été envoyé à ${email}` : email,
      });
      setOpen(false);
      reset();
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Créer un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur dans {organizationName}</DialogTitle>
          <DialogDescription>
            Sans mot de passe, un email d'invitation est envoyé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cuEmail">Email *</Label>
            <Input id="cuEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@exemple.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuName">Nom complet *</Label>
            <Input id="cuName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuPwd">Mot de passe</Label>
            <Input id="cuPwd" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Laisser vide pour envoyer une invitation" />
          </div>
          <div className="space-y-2">
            <Label>Rôle *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="recruiter">Recruteur</SelectItem>
                <SelectItem value="viewer">Observateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !email.trim() || !fullName.trim() || !role}
          >
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

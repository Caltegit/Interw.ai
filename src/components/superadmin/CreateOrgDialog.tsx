import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Props {
  onCreated: () => void;
}

export function CreateOrgDialog({ onCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");

  const handleCreate = async () => {
    if (!orgName.trim() || !adminEmail.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("superadmin-create-org", {
        body: {
          org_name: orgName.trim(),
          admin_email: adminEmail.trim().toLowerCase(),
          admin_full_name: adminName.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const wasInvited = (data as { invited?: boolean })?.invited;
      toast({
        title: "Organisation créée",
        description: wasInvited
          ? `Invitation envoyée à ${adminEmail}`
          : `Compte existant rattaché à ${adminEmail}`,
      });
      setOrgName("");
      setAdminEmail("");
      setAdminName("");
      setOpen(false);
      onCreated();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer une organisation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une organisation</DialogTitle>
          <DialogDescription>
            L'admin sera rattaché immédiatement. Un email lui sera envoyé pour définir son mot de passe s'il n'a pas encore de compte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nom de l'organisation *</Label>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminName">Nom de l'admin (optionnel)</Label>
            <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email de l'admin *</Label>
            <Input id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@acme.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
          <Button onClick={handleCreate} disabled={loading || !orgName.trim() || !adminEmail.trim()}>
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

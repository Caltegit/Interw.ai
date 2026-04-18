import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { slugify } from "@/lib/slug";

interface Props {
  onCreated: () => void;
}

export function CreateOrgDialog({ onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");

  const handleCreate = async () => {
    if (!user || !orgName.trim() || !adminEmail.trim()) return;
    setLoading(true);
    try {
      // 1. Créer l'organisation avec slug unique
      let baseSlug = slugify(orgName.trim()) || "org";
      let candidate = baseSlug;
      let counter = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: existing } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", candidate)
          .maybeSingle();
        if (!existing) break;
        counter += 1;
        candidate = `${baseSlug}-${counter}`;
      }

      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: orgName.trim(), slug: candidate })
        .select()
        .single();
      if (orgErr) throw orgErr;

      // 2. Créer l'invitation
      const { data: invitation, error: invErr } = await supabase
        .from("organization_invitations")
        .insert({
          organization_id: org.id,
          email: adminEmail.trim().toLowerCase(),
          invited_by: user.id,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      // 3. Envoyer l'email d'invitation
      await supabase.functions.invoke("send-invitation", {
        body: {
          email: adminEmail.trim().toLowerCase(),
          organizationId: org.id,
          invitationToken: invitation.token,
        },
      });

      toast({
        title: "Organisation créée",
        description: `Invitation envoyée à ${adminEmail}`,
      });
      setOrgName("");
      setAdminEmail("");
      setAdminName("");
      setOpen(false);
      onCreated();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
            Une invitation sera envoyée à l'admin pour qu'il rejoigne l'organisation.
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
            {loading ? "Création..." : "Créer et inviter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface OrgOption { id: string; name: string }

interface Props {
  onCreated: () => void;
}

export function CreateUserDialog({ onCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState<string>("none");
  const [role, setRole] = useState<string>("none");

  useEffect(() => {
    if (!open) return;
    supabase.from("organizations").select("id, name").order("name").then(({ data }) => setOrgs(data ?? []));
  }, [open]);

  const handleCreate = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("superadmin-manage-user", {
        body: {
          action: "create",
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() || undefined,
          password: password || undefined,
          organization_id: orgId !== "none" ? orgId : undefined,
          role: role !== "none" ? role : undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Utilisateur créé", description: email });
      setOpen(false);
      setEmail(""); setFullName(""); setPassword(""); setOrgId("none"); setRole("none");
      onCreated();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Créer un utilisateur</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>Crée directement un compte (email confirmé). Pas d'invitation envoyée.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@exemple.com" />
          </div>
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe (optionnel)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Laisser vide pour aléatoire" />
          </div>
          <div className="space-y-2">
            <Label>Organisation</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                <SelectItem value="super_admin">Super Admin (global)</SelectItem>
                <SelectItem value="admin">Admin (org)</SelectItem>
                <SelectItem value="recruiter">Recruteur (org)</SelectItem>
                <SelectItem value="viewer">Viewer (org)</SelectItem>
              </SelectContent>
            </Select>
            {role !== "none" && role !== "super_admin" && orgId === "none" && (
              <p className="text-xs text-destructive">Sélectionne une organisation pour ce rôle.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !email.trim() || (role !== "none" && role !== "super_admin" && orgId === "none")}
          >
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

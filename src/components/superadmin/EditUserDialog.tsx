import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  organization_id: string | null;
  roles: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: UserRow | null;
  onUpdated: () => void;
}

interface OrgOption { id: string; name: string }

export function EditUserDialog({ open, onOpenChange, user, onUpdated }: Props) {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState<string>("none");
  const [newRole, setNewRole] = useState<string>("recruiter");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.full_name);
    setEmail(user.email);
    setOrgId(user.organization_id ?? "none");
    supabase.from("organizations").select("id, name").order("name").then(({ data }) => setOrgs(data ?? []));
  }, [open, user]);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("superadmin-manage-user", { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (fullName !== user.full_name || email !== user.email) {
        await invoke({ action: "update_profile", user_id: user.user_id, full_name: fullName, email: email !== user.email ? email : undefined });
      }
      if ((orgId === "none" ? null : orgId) !== user.organization_id) {
        await invoke({ action: "move_org", user_id: user.user_id, organization_id: orgId === "none" ? null : orgId });
      }
      toast({ title: "Profil mis à jour" });
      onUpdated();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const orgForRole = newRole === "super_admin" ? null : (orgId === "none" ? null : orgId);
      if (newRole !== "super_admin" && !orgForRole) throw new Error("L'utilisateur doit être dans une organisation pour ce rôle.");
      await invoke({ action: "set_role", user_id: user.user_id, role: newRole, organization_id: orgForRole });
      toast({ title: "Rôle ajouté" });
      onUpdated();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await invoke({
        action: "remove_role",
        user_id: user.user_id,
        role,
        organization_id: role === "super_admin" ? null : user.organization_id,
      });
      toast({ title: "Rôle retiré" });
      onUpdated();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
          <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
            Enregistrer profil & organisation
          </Button>

          <div className="border-t pt-4 space-y-2">
            <Label>Rôles actuels</Label>
            <div className="flex gap-2 flex-wrap">
              {user.roles.length === 0 && <span className="text-sm text-muted-foreground">Aucun rôle</span>}
              {user.roles.map(r => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button onClick={() => handleRemoveRole(r)} disabled={loading} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ajouter / remplacer un rôle</Label>
            <div className="flex gap-2">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin (global)</SelectItem>
                  <SelectItem value="admin">Admin (org)</SelectItem>
                  <SelectItem value="recruiter">Recruteur (org)</SelectItem>
                  <SelectItem value="viewer">Viewer (org)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddRole} disabled={loading}>Appliquer</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Les rôles d'org remplacent les rôles existants dans l'organisation sélectionnée.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

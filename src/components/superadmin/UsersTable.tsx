import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditUserDialog } from "./EditUserDialog";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  organization_id: string | null;
  org_name: string | null;
  roles: string[];
  created_at: string;
}

interface Props {
  refreshKey?: number;
  onChange?: () => void;
}

export function UsersTable({ refreshKey = 0, onChange }: Props) {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = () => { setTick((t) => t + 1); onChange?.(); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, organization_id, created_at")
        .order("created_at", { ascending: false });

      if (!profiles) { setUsers([]); setLoading(false); return; }

      const orgIds = [...new Set(profiles.map(p => p.organization_id).filter(Boolean))] as string[];
      const [{ data: orgs }, { data: roles }] = await Promise.all([
        orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({ data: [] as any }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
      const rolesMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });

      setUsers(profiles.map((p) => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        organization_id: p.organization_id,
        org_name: p.organization_id ? orgMap.get(p.organization_id) ?? null : null,
        roles: rolesMap.get(p.user_id) ?? [],
        created_at: p.created_at,
      })));
      setLoading(false);
    })();
  }, [refreshKey, tick]);

  const handleDelete = async (u: UserRow) => {
    const { data, error } = await supabase.functions.invoke("superadmin-manage-user", {
      body: { action: "delete", user_id: u.user_id },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Erreur", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Utilisateur supprimé" });
      refresh();
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organisation</TableHead>
            <TableHead>Rôles</TableHead>
            <TableHead>Inscrit le</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.user_id}>
              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.org_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {u.roles.length === 0 && <span className="text-muted-foreground text-xs">aucun</span>}
                  {u.roles.map(r => (
                    <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"}>{r}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{new Date(u.created_at).toLocaleDateString("fr-FR")}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setEditOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={u.user_id === me?.id}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer {u.email} ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le compte et son profil seront supprimés.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(u)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun utilisateur</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={editing}
        onUpdated={refresh}
      />
    </>
  );
}

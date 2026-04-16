import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  organization_id: string | null;
  org_name: string | null;
  roles: string[];
  created_at: string;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, organization_id, created_at")
        .order("created_at", { ascending: false });

      if (!profiles) { setUsers([]); setLoading(false); return; }

      const orgIds = [...new Set(profiles.map(p => p.organization_id).filter(Boolean))] as string[];
      const userIds = profiles.map(p => p.id);

      const [{ data: orgs }, { data: roles }] = await Promise.all([
        orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({ data: [] }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const orgMap = new Map((orgs ?? []).map(o => [o.id, o.name]));
      const rolesMap = new Map<string, string[]>();
      (roles ?? []).forEach(r => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });

      // profiles.id is profile id; we need user_id for roles match
      const { data: profilesWithUser } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, organization_id, created_at")
        .order("created_at", { ascending: false });

      setUsers((profilesWithUser ?? []).map(p => ({
        id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        organization_id: p.organization_id,
        org_name: p.organization_id ? orgMap.get(p.organization_id) ?? null : null,
        roles: rolesMap.get(p.user_id) ?? [],
        created_at: p.created_at,
      })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Organisation</TableHead>
          <TableHead>Rôles</TableHead>
          <TableHead>Inscrit le</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
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
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun utilisateur</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}

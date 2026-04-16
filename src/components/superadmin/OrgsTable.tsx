import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrgRow {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  member_count: number;
  project_count: number;
}

interface Props {
  refreshKey: number;
  onChange: () => void;
}

export function OrgsTable({ refreshKey, onChange }: Props) {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: orgsData } = await supabase
        .from("organizations")
        .select("id, name, logo_url, created_at")
        .order("created_at", { ascending: false });

      if (!orgsData) { setOrgs([]); setLoading(false); return; }

      const enriched = await Promise.all(
        orgsData.map(async (o) => {
          const [{ count: members }, { count: projects }] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", o.id),
            supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", o.id),
          ]);
          return { ...o, member_count: members ?? 0, project_count: projects ?? 0 };
        })
      );
      setOrgs(enriched);
      setLoading(false);
    })();
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("organizations").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organisation supprimée" });
      onChange();
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Membres</TableHead>
          <TableHead>Projets</TableHead>
          <TableHead>Créée le</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orgs.map((org) => (
          <TableRow key={org.id}>
            <TableCell className="font-medium flex items-center gap-2">
              {org.logo_url && <img src={org.logo_url} alt="" className="h-6 w-6 rounded object-cover" />}
              {org.name}
            </TableCell>
            <TableCell>{org.member_count}</TableCell>
            <TableCell>{org.project_count}</TableCell>
            <TableCell>{new Date(org.created_at).toLocaleDateString("fr-FR")}</TableCell>
            <TableCell className="text-right">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer {org.name} ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Tous les projets, sessions et données liés seront perdus.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(org.id)}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
        {orgs.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune organisation</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, ShieldCheck, Users, Briefcase, Pencil, Trash2 } from "lucide-react";
import { CreateUserInOrgDialog } from "@/components/superadmin/CreateUserInOrgDialog";
import { EditOrgDialog } from "@/components/superadmin/EditOrgDialog";
import { EditUserDialog } from "@/components/superadmin/EditUserDialog";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface OrgDetail {
  id: string;
  name: string;
  logo_url: string | null;
  pricing: string | null;
  client_notes: string | null;
  owner_id: string | null;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string | null;
  isOwner: boolean;
}

interface ProjectRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function SuperAdminOrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingUser, setEditingUser] = useState<Member | null>(null);
  const [deletingUser, setDeletingUser] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const [orgRes, profilesRes, rolesRes, projectsRes] = await Promise.all([
        supabase.from("organizations").select("id, name, logo_url, pricing, client_notes, owner_id, created_at").eq("id", orgId).maybeSingle(),
        supabase.from("profiles").select("id, user_id, full_name, email").eq("organization_id", orgId),
        supabase.from("user_roles").select("user_id, role").eq("organization_id", orgId),
        supabase.from("projects").select("id, title, status, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }),
      ]);

      if (orgRes.error || !orgRes.data) {
        toast({ title: "Organisation introuvable", variant: "destructive" });
        navigate("/admin");
        return;
      }
      const orgData = orgRes.data as OrgDetail;
      setOrg(orgData);

      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r) => roleMap.set(r.user_id, r.role));

      const enriched: Member[] = (profilesRes.data || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        role: roleMap.get(m.user_id) ?? null,
        isOwner: m.user_id === orgData.owner_id,
      }));
      setMembers(enriched);
      setProjects((projectsRes.data || []) as ProjectRow[]);
      setLoading(false);
    })();
  }, [orgId, refreshKey, navigate, toast]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("superadmin-manage-user", {
        body: { action: "delete", user_id: deletingUser.user_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Utilisateur supprimé" });
      setDeletingUser(null);
      refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !org) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {org.logo_url && <img src={org.logo_url} alt="" className="h-14 w-14 rounded object-cover" />}
            <div>
              <CardTitle className="text-2xl">{org.name}</CardTitle>
              <CardDescription>Créée le {new Date(org.created_at).toLocaleDateString("fr-FR")}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Modifier</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Tarif</p>
            <p className="text-sm">{org.pricing || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Note client</p>
            <p className="text-sm whitespace-pre-wrap">{org.client_notes || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" /> Utilisateurs
            </CardTitle>
            <CardDescription>{members.length} membre{members.length > 1 ? "s" : ""}</CardDescription>
          </div>
          <CreateUserInOrgDialog organizationId={org.id} organizationName={org.name} onCreated={refresh} />
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun utilisateur dans cette organisation.</p>
          )}
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{m.full_name || "Sans nom"}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {m.isOwner && <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Propriétaire</Badge>}
                {m.role === "admin" && !m.isOwner && <Badge variant="default" className="gap-1"><ShieldCheck className="h-3 w-3" /> Admin</Badge>}
                {m.role === "recruiter" && <Badge variant="secondary">Recruteur</Badge>}
                {m.role === "viewer" && <Badge variant="outline">Observateur</Badge>}
                {!m.role && <Badge variant="outline">Sans rôle</Badge>}
                <Button variant="ghost" size="icon" onClick={() => setEditingUser(m)} title="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingUser(m)}
                  disabled={m.user_id === currentUser?.id}
                  title={m.user_id === currentUser?.id ? "Vous ne pouvez pas vous supprimer" : "Supprimer"}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" /> Projets
          </CardTitle>
          <CardDescription>{projects.length} projet{projects.length > 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun projet.</p>
          )}
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">Créé le {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <EditOrgDialog open={editOpen} onOpenChange={setEditOpen} org={org} onUpdated={refresh} />

      <EditUserDialog
        open={!!editingUser}
        onOpenChange={(o) => !o && setEditingUser(null)}
        user={
          editingUser
            ? {
                user_id: editingUser.user_id,
                email: editingUser.email,
                full_name: editingUser.full_name,
                organization_id: org.id,
                roles: editingUser.role ? [editingUser.role] : [],
              }
            : null
        }
        onUpdated={() => {
          setEditingUser(null);
          refresh();
        }}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser?.email} sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Pencil, Trash2, Eye, MoreHorizontal, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  active: { label: "Actif", variant: "default" },
  archived: { label: "Archivé", variant: "outline" },
};

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const copyCandidateLink = (slug: string | null) => {
    if (!slug) {
      toast({ title: "Lien indisponible", description: "Ce projet n'a pas de slug défini.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(`${window.location.origin}/interview/${slug}`);
    toast({ title: "Lien candidat copié !" });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.rpc("delete_project", { _project_id: toDelete.id });
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le projet.", variant: "destructive" });
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== toDelete.id));
      toast({ title: "Projet supprimé" });
    }
    setToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-muted-foreground">Gérez vos campagnes de recrutement</p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Aucun projet créé</p>
            <Button asChild>
              <Link to="/projects/new">Créer votre premier projet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead className="hidden md:table-cell">Poste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Créé le</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const status = statusLabels[project.status] ?? { label: project.status, variant: "outline" as const };
                  return (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <div className="truncate">{project.title}</div>
                          {project.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-md">{project.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{project.job_title}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {new Date(project.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Inline actions on desktop */}
                          <div className="hidden md:flex items-center gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/projects/${project.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:ml-1">Voir</span>
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => copyCandidateLink(project.slug)}>
                              <Link2 className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-1">Lien candidat</span>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/projects/${project.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:ml-1">Modifier</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setToDelete({ id: project.id, title: project.title })}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-1">Supprimer</span>
                            </Button>
                          </div>
                          {/* Compact menu on mobile */}
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyCandidateLink(project.slug)}>
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Lien
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/edit`)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setToDelete({ id: project.id, title: project.title })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {toDelete?.title} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les sessions et données associées seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

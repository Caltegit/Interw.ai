import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProjectsList } from "@/hooks/queries/useProjectsList";
import { queryKeys } from "@/lib/queryClient";
import { logger } from "@/lib/logger";

const PAGE_SIZE = 20;

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  active: { label: "Actif", variant: "default" },
  archived: { label: "Archivé", variant: "outline" },
};

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useProjectsList(user?.id);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const pageProjects = useMemo(
    () => projects.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [projects, page],
  );

  const copyCandidateLink = (slug: string | null) => {
    if (!slug) {
      toast({ title: "Lien indisponible", description: "Ce projet n'a pas de slug défini.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(`${window.location.origin}/session/${slug}`);
    toast({ title: "Lien candidat copié !" });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.rpc("delete_project", { _project_id: toDelete.id });
    if (error) {
      logger.error("project_delete_failed", { projectId: toDelete.id, error: error.message });
      toast({ title: "Erreur", description: "Impossible de supprimer le projet.", variant: "destructive" });
    } else {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
      }
      toast({ title: "Projet supprimé" });
    }
    setToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
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
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="hidden sm:table-cell">Depuis</TableHead>
                  <TableHead className="text-center">Lien candidat</TableHead>
                  <TableHead className="text-center">Modifier</TableHead>
                  <TableHead className="text-center">Supprimer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageProjects.map((project) => {
                  const status = statusLabels[project.status] ?? { label: project.status, variant: "outline" as const };
                  const sessionCount = project.sessions?.[0]?.count ?? 0;
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
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">{sessionCount}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {(() => {
                          const days = Math.floor((Date.now() - new Date(project.created_at).getTime()) / 86400000);
                          if (days === 0) return "aujourd'hui";
                          if (days === 1) return "1 jour";
                          return `${days} jours`;
                        })()}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCandidateLink(project.slug)}
                          aria-label="Copier le lien candidat"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" asChild aria-label="Modifier">
                          <Link to={`/projects/${project.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete({ id: project.id, title: project.title })}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {projects.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} / {totalPages} — {projects.length} projets
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
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

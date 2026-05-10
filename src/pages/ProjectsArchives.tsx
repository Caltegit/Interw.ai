import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, ArchiveRestore, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProjectsList } from "@/hooks/queries/useProjectsList";
import { queryKeys } from "@/lib/queryClient";
import { logger } from "@/lib/logger";

export default function ProjectsArchives() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allProjects = [], isLoading } = useProjectsList(user?.id);
  const projects = useMemo(() => allProjects.filter((p) => p.status === "archived"), [allProjects]);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const invalidate = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
    }
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from("projects").update({ status: "active" }).eq("id", id);
    if (error) {
      logger.error("project_restore_failed", { projectId: id, error: error.message });
      toast({ title: "Erreur", description: "Impossible de restaurer le projet.", variant: "destructive" });
    } else {
      invalidate();
      toast({ title: "Projet restauré" });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.rpc("delete_project", { _project_id: toDelete.id });
    if (error) {
      logger.error("project_delete_failed", { projectId: toDelete.id, error: error.message });
      toast({ title: "Erreur", description: "Impossible de supprimer le projet.", variant: "destructive" });
    } else {
      invalidate();
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
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Projets actifs
        </Button>
        <h1 className="text-lg font-semibold">Archives</h1>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun projet archivé.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="hidden sm:table-cell">Archivé depuis</TableHead>
                  <TableHead className="text-center">Restaurer</TableHead>
                  <TableHead className="text-center">Supprimer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const sessionCount = project.sessions?.[0]?.count ?? 0;
                  return (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="truncate">{project.title}</div>
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
                          onClick={() => handleRestore(project.id)}
                          aria-label="Restaurer"
                        >
                          <ArchiveRestore className="h-4 w-4" />
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

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement « {toDelete?.title} » ?</AlertDialogTitle>
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

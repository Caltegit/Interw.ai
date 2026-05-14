import { useAuth } from "@/contexts/AuthContext";
import { useProjectsList } from "@/hooks/queries/useProjectsList";
import { Button } from "@/components/ui/button";

export function CopilotProjectPicker({ onPick }: { onPick: (id: string) => void }) {
  const { user } = useAuth();
  const { data, isLoading } = useProjectsList(user?.id);
  const projects = (data ?? []).filter((p) => p.status === "active");

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Choisissez un projet pour démarrer une conversation avec le copilote.
      </p>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun projet actif.</p>
      )}
      <div className="flex flex-col gap-1">
        {projects.map((p) => (
          <Button
            key={p.id}
            variant="ghost"
            className="justify-start text-left"
            onClick={() => onPick(p.id)}
          >
            {p.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

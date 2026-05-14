import { useCopilotThreads, useCreateCopilotThread, useDeleteCopilotThread, type CopilotMode } from "@/hooks/queries/useCopilot";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  userId: string | null;
  mode: CopilotMode;
  activeThreadId: string | null;
  onSelect: (id: string | null) => void;
}

export function CopilotThreadSwitcher({ projectId, userId, mode, activeThreadId, onSelect }: Props) {
  const { data: threads = [] } = useCopilotThreads(projectId, userId, mode);
  const create = useCreateCopilotThread();
  const del = useDeleteCopilotThread();

  const handleCreate = async () => {
    if (!userId) return;
    try {
      const t = await create.mutateAsync({ projectId, userId, mode });
      onSelect(t.id);
    } catch (e: any) {
      toast.error(e?.message || "Impossible de créer la conversation");
    }
  };

  const handleDelete = async () => {
    if (!activeThreadId || !userId) return;
    if (!confirm("Supprimer cette conversation ?")) return;
    try {
      await del.mutateAsync({ threadId: activeThreadId, projectId, userId });
      onSelect(null);
    } catch (e: any) {
      toast.error(e?.message || "Suppression impossible");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeThreadId ?? ""}
        onValueChange={(v) => onSelect(v || null)}
        disabled={threads.length === 0}
      >
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder={threads.length === 0 ? "Aucune conversation" : "Choisir un fil"} />
        </SelectTrigger>
        <SelectContent>
          {threads.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-sm">
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleCreate}
        disabled={create.isPending}
        title="Nouvelle conversation"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleDelete}
        disabled={!activeThreadId || del.isPending}
        title="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

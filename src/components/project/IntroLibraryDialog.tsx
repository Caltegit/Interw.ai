import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Video, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IntroTemplate {
  id: string;
  name: string;
  type: "audio" | "video";
  audio_url: string | null;
  video_url: string | null;
  description: string | null;
}

interface Props {
  type: "audio" | "video";
  onSelect: (item: IntroTemplate) => void;
}

export function IntroLibraryDialog({ type, onSelect }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<IntroTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
    if (!orgId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("intro_templates" as never)
      .select("*")
      .eq("organization_id", orgId)
      .eq("type", type)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setItems((data as unknown as IntroTemplate[]) || []);
    }
    setLoading(false);
  }, [user, type, toast]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Library className="mr-1 h-4 w-4" /> Choisir depuis la bibliothèque
      </Button>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bibliothèque d'intros — {type === "audio" ? "Audio" : "Vidéo"}</DialogTitle>
          <DialogDescription>Sélectionnez une intro pour l'utiliser dans ce projet.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune intro {type} dans la bibliothèque. Créez-en une depuis la page Bibliothèque &gt; Intros.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <Badge variant={item.type === "audio" ? "secondary" : "default"}>
                      {item.type === "audio" ? (
                        <Mic className="h-3 w-3" />
                      ) : (
                        <Video className="h-3 w-3" />
                      )}
                    </Badge>
                  </div>
                  {item.type === "audio" && item.audio_url && (
                    <audio controls src={item.audio_url} className="w-full" />
                  )}
                  {item.type === "video" && item.video_url && (
                    <video controls src={item.video_url} className="w-full rounded" />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    Utiliser cette intro
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

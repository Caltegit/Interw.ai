import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  org: { id: string; name: string } | null;
  onUpdated: () => void;
}

export function EditOrgDialog({ open, onOpenChange, org, onUpdated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (org) setName(org.name);
  }, [org]);

  const handleSave = async () => {
    if (!org || !name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("organizations").update({ name: name.trim() }).eq("id", org.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organisation mise à jour" });
      onOpenChange(false);
      onUpdated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'organisation</DialogTitle>
          <DialogDescription>Changer le nom de l'organisation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="orgEditName">Nom *</Label>
          <Input id="orgEditName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Annuler</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  org: { id: string; name: string; pricing?: string | null; client_notes?: string | null } | null;
  onUpdated: () => void;
}

export function EditOrgDialog({ open, onOpenChange, org, onUpdated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [pricing, setPricing] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setPricing(org.pricing ?? "");
      setClientNotes(org.client_notes ?? "");
    }
  }, [org]);

  const handleSave = async () => {
    if (!org || !name.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: name.trim(),
        pricing: pricing.trim() || null,
        client_notes: clientNotes.trim() || null,
      })
      .eq("id", org.id);
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
          <DialogDescription>Mettre à jour les informations de l'organisation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgEditName">Nom *</Label>
            <Input id="orgEditName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgEditPricing">Tarif</Label>
            <Input id="orgEditPricing" value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="99 €/mois" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgEditNotes">Note client</Label>
            <Textarea
              id="orgEditNotes"
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              rows={3}
            />
          </div>
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

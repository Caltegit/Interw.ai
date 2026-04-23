import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  org: {
    id: string;
    name: string;
    pricing?: string | null;
    client_notes?: string | null;
    session_credits_unlimited?: boolean | null;
    session_credits_total?: number | null;
  } | null;
  onUpdated: () => void;
}

export function EditOrgDialog({ open, onOpenChange, org, onUpdated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [pricing, setPricing] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [creditsUnlimited, setCreditsUnlimited] = useState(true);
  const [creditsTotal, setCreditsTotal] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setPricing(org.pricing ?? "");
      setClientNotes(org.client_notes ?? "");
      setCreditsUnlimited(org.session_credits_unlimited ?? true);
      setCreditsTotal(
        org.session_credits_total !== null && org.session_credits_total !== undefined
          ? String(org.session_credits_total)
          : "",
      );
    }
  }, [org]);

  const handleSave = async () => {
    if (!org || !name.trim()) return;
    if (!creditsUnlimited && (!creditsTotal.trim() || Number(creditsTotal) < 0)) {
      toast({ title: "Erreur", description: "Indiquez un nombre de crédits valide", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: name.trim(),
        pricing: pricing.trim() || null,
        client_notes: clientNotes.trim() || null,
        session_credits_unlimited: creditsUnlimited,
        session_credits_total: creditsUnlimited ? null : Math.max(0, Math.floor(Number(creditsTotal))),
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
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="orgEditCreditsUnlimited" className="cursor-pointer">Crédits de sessions illimités</Label>
              <Switch
                id="orgEditCreditsUnlimited"
                checked={creditsUnlimited}
                onCheckedChange={setCreditsUnlimited}
              />
            </div>
            {!creditsUnlimited && (
              <div className="space-y-2">
                <Label htmlFor="orgEditCreditsTotal">Nombre de crédits</Label>
                <Input
                  id="orgEditCreditsTotal"
                  type="number"
                  min={0}
                  step={1}
                  value={creditsTotal}
                  onChange={(e) => setCreditsTotal(e.target.value)}
                  placeholder="100"
                />
              </div>
            )}
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

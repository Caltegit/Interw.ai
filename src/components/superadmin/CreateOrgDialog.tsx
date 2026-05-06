import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Props {
  onCreated: () => void;
}

export function CreateOrgDialog({ onCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [pricing, setPricing] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [seedLibraries, setSeedLibraries] = useState(true);
  const [creditsUnlimited, setCreditsUnlimited] = useState(true);
  const [creditsTotal, setCreditsTotal] = useState("");

  const reset = () => {
    setOrgName("");
    setOwnerEmail("");
    setOwnerFirstName("");
    setOwnerLastName("");
    setPricing("");
    setClientNotes("");
    setSeedLibraries(true);
    setCreditsUnlimited(true);
    setCreditsTotal("");
  };

  const canSubmit =
    orgName.trim() &&
    ownerEmail.trim() &&
    ownerFirstName.trim() &&
    ownerLastName.trim();

  const handleCreate = async () => {
    if (!canSubmit) return;
    if (!creditsUnlimited && (!creditsTotal.trim() || Number(creditsTotal) < 0)) {
      toast({ title: "Erreur", description: "Indiquez un nombre de crédits valide", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("superadmin-create-org", {
        body: {
          org_name: orgName.trim(),
          owner_email: ownerEmail.trim().toLowerCase(),
          owner_first_name: ownerFirstName.trim(),
          owner_last_name: ownerLastName.trim(),
          pricing: pricing.trim() || undefined,
          client_notes: clientNotes.trim() || undefined,
          seed_libraries: seedLibraries,
          session_credits_unlimited: creditsUnlimited,
          session_credits_total: creditsUnlimited ? null : Number(creditsTotal),
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      toast({ title: "Organisation créée", description: "Une invitation a été envoyée au propriétaire." });
      reset();
      setOpen(false);
      onCreated();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer une organisation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une organisation</DialogTitle>
          <DialogDescription>
            Renseignez le propriétaire de l'organisation. Il recevra un email pour activer son compte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nom de l'organisation *</Label>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." />
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <h4 className="text-sm font-medium">Propriétaire</h4>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="proprietaire@exemple.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName">Prénom *</Label>
                <Input id="ownerFirstName" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerLastName">Nom *</Label>
                <Input id="ownerLastName" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing">Tarif</Label>
            <Input id="pricing" value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="99 €/mois" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientNotes">Note client</Label>
            <Textarea
              id="clientNotes"
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Informations internes sur ce client"
              rows={3}
            />
          </div>
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="creditsUnlimited" className="cursor-pointer">Crédits de sessions illimités</Label>
              <Switch id="creditsUnlimited" checked={creditsUnlimited} onCheckedChange={setCreditsUnlimited} />
            </div>
            {!creditsUnlimited && (
              <div className="space-y-2">
                <Label htmlFor="creditsTotal">Nombre de crédits</Label>
                <Input
                  id="creditsTotal"
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
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="seedLibraries" className="cursor-pointer">Charger les bibliothèques de modèles par défaut</Label>
              <p className="text-xs text-muted-foreground">Questions, critères, modèles d'entretien et projet de démonstration.</p>
            </div>
            <Switch id="seedLibraries" checked={seedLibraries} onCheckedChange={setSeedLibraries} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
          <Button onClick={handleCreate} disabled={loading || !canSubmit}>
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

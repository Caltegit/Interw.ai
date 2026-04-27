import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle?: string;
  orgName?: string;
}

export default function ConsentDialog({ open, onOpenChange, jobTitle, orgName }: ConsentDialogProps) {
  const job = jobTitle?.trim() || "ce poste";
  const org = orgName?.trim() || "l'organisation recruteuse";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Conditions de traitement de vos données
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-4 text-sm leading-relaxed">
            <section>
              <h3 className="font-semibold text-foreground mb-1">1. Données collectées</h3>
              <p className="text-muted-foreground">
                Pendant cette session pour <span className="text-foreground font-medium">{job}</span>, nous collectons :
                votre nom, votre adresse e-mail, l'enregistrement audio et vidéo de vos réponses, la transcription
                écrite de vos propos, ainsi que des métadonnées techniques (durée, horodatage).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">2. Finalité du traitement</h3>
              <p className="text-muted-foreground">
                Vos données sont utilisées exclusivement pour évaluer votre candidature dans le cadre du processus de
                recrutement de <span className="text-foreground font-medium">{org}</span>. Aucune autre finalité n'est
                poursuivie (pas de revente, pas de profilage publicitaire).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">3. Qui a accès à vos données</h3>
              <p className="text-muted-foreground">
                Seules les équipes de recrutement habilitées de <span className="text-foreground font-medium">{org}</span>
                peuvent consulter votre session et le rapport généré. Nos prestataires techniques (hébergement,
                transcription, analyse IA) accèdent aux données uniquement pour fournir le service, sous contrat de
                confidentialité.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">4. Durée de conservation</h3>
              <p className="text-muted-foreground">
                Vos données sont conservées au maximum 24 mois après la fin du processus de recrutement, puis
                supprimées automatiquement. Vous pouvez demander leur suppression à tout moment.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">5. Vos droits RGPD</h3>
              <p className="text-muted-foreground">
                Conformément au Règlement Général sur la Protection des Données, vous disposez d'un droit d'accès,
                de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données. Vous
                pouvez exercer ces droits en contactant l'organisation recruteuse.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">6. Analyse par intelligence artificielle</h3>
              <p className="text-muted-foreground">
                Vos réponses sont analysées par un système d'intelligence artificielle qui produit un rapport
                d'évaluation (résumé, points forts, axes de progrès, scores par critère). Cette analyse est un outil
                d'aide à la décision : la décision finale d'embauche reste humaine. Vous avez le droit de demander
                une révision humaine de l'analyse.
              </p>
            </section>

            <section className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <h3 className="font-semibold text-foreground mb-1">7. Droit de retrait — suppression totale</h3>
              <p className="text-muted-foreground">
                Vous pouvez interrompre la session à tout moment. À l'arrêt, vous avez le choix entre :
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li><span className="text-foreground">Envoyer vos réponses</span> pour analyse par le recruteur.</li>
                <li>
                  <span className="text-foreground">Tout annuler et tout supprimer</span> : aucune vidéo, aucun audio,
                  aucune transcription ni aucun rapport ne sera conservé. Toutes vos données seront définitivement
                  effacées de nos serveurs.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">8. Contact</h3>
              <p className="text-muted-foreground">
                Pour toute question relative au traitement de vos données, contactez directement
                <span className="text-foreground font-medium"> {org}</span>, responsable du traitement.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[44px]">
            J'ai compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

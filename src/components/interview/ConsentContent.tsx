import { ShieldCheck } from "lucide-react";

interface ConsentContentProps {
  jobTitle?: string;
  orgName?: string;
  showHeader?: boolean;
}

/**
 * Contenu RGPD partagé entre `ConsentDialog` (modal d'entretien) et la
 * page publique `/session/:slug/privacy/:token` (lien depuis l'email).
 */
export default function ConsentContent({
  jobTitle,
  orgName,
  showHeader = false,
}: ConsentContentProps) {
  const job = jobTitle?.trim() || "ce poste";
  const org = orgName?.trim() || "l'organisation recruteuse";

  return (
    <div className="space-y-5 text-sm leading-relaxed">
      {showHeader && (
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Conditions de traitement de vos données
          </h2>
        </div>
      )}

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
          Seules les équipes de recrutement habilitées de <span className="text-foreground font-medium">{org}</span>{" "}
          peuvent consulter votre session et le rapport généré. Nos prestataires techniques (hébergement,
          transcription, analyse IA) accèdent aux données uniquement pour fournir le service, sous contrat de
          confidentialité.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-1">4. Durée de conservation</h3>
        <p className="text-muted-foreground">
          Les enregistrements audio et vidéo sont conservés au maximum 12 mois après la fin de l'entretien, puis
          supprimés automatiquement de nos serveurs. Les autres données (transcription, rapport, métadonnées)
          peuvent être conservées plus longtemps pour les besoins du recrutement, dans la limite de 24 mois. Vous
          pouvez demander leur suppression complète à tout moment.
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
          Pour toute question relative au traitement de vos données, contactez directement{" "}
          <span className="text-foreground font-medium">{org}</span>, responsable du traitement.
        </p>
      </section>
    </div>
  );
}

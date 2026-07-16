## Problème

Aujourd'hui le bouton « Régénérer le rapport » ne fait qu'une chose : envoyer la demande en file d'attente (`enqueue_report_job`), puis afficher un simple toast. La mutation se termine instantanément, le bouton arrête de tourner, et **aucun rafraîchissement n'est fait quand le worker a fini** — l'ancien rapport reste affiché. L'utilisateur pense qu'il ne s'est rien passé.

## Solution

Ajouter une **boîte de dialogue bloquante** pendant la régénération, avec suivi en direct de l'état du job, puis rafraîchissement automatique.

### Nouveau comportement
1. Clic sur « Régénérer le rapport » → enqueue immédiat.
2. Ouverture d'une modale non fermable avec :
   - Titre : « Régénération du rapport en cours »
   - Icône animée + message d'étape (« En file d'attente… » → « Analyse en cours… »)
   - Sous-texte : « Cela prend en général 30 à 60 secondes. »
   - Un bouton discret « Fermer et continuer en arrière-plan ».
3. Polling toutes les 3 s de `report_jobs` (dernière ligne pour la session).
   - `queued` → « En file d'attente… »
   - `processing` → « Analyse en cours… »
   - `done` → refetch du rapport + fermeture + toast succès « Rapport mis à jour. »
   - `failed` → fermeture + toast d'erreur avec le message.
4. Timeout de sécurité à 3 min : on ferme la modale avec message « La régénération prend plus de temps que prévu, elle se poursuit en arrière-plan. Rafraîchissez la page dans une minute. »
5. Si l'utilisateur ferme la modale volontairement, le polling continue silencieusement et un toast final s'affichera quand le rapport sera prêt.

### Fichiers touchés (frontend uniquement)
- `src/hooks/queries/useSessionDetail.ts` : `useRegenerateReport` renvoie aussi `jobStartedAt` ; nouveau hook `useReportJobStatus(sessionId, enabled)` qui poll `report_jobs` toutes les 3 s.
- `src/components/session/RegenerateReportDialog.tsx` (nouveau) : modale d'attente avec les états `queued | processing | done | failed | timeout`.
- `src/pages/SessionDetail.tsx` : orchestre — ouvre la modale au clic, écoute les statuts, invalide `queryKeys.session(id)` à la complétion.

### Hors scope
- Pas de changement backend : la table `report_jobs` et le worker `process-report-queue` existent déjà et exposent `status`, `last_error`, `completed_at`.
- Pas de refonte du bouton lui-même dans `DecisionBanner` — on garde son état `isRegenerating` en le calant sur « job en cours OU mutation en vol ».
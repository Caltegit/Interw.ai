

## Plan : Écran d'attente avant l'écran final

### Approche (Option A)

Rediriger immédiatement le candidat vers `/interview/:slug/complete/:token` dès la fin logique de l'entretien. La page `InterviewComplete` affiche un état "Enregistrement en cours…" tant que la session n'est pas finalisée, puis bascule automatiquement sur l'écran final.

### Investigation préalable
Lire `src/pages/InterviewStart.tsx` pour identifier où se déclenche la fin d'entretien et quelles opérations bloquent la redirection (upload final, finalize session, génération rapport).

### Modifications

**1. `src/pages/InterviewStart.tsx`**
- À la fin de la dernière question : déclencher la redirection vers `/interview/:slug/complete/:token` immédiatement.
- Laisser les opérations async (upload media restant, mise à jour `sessions.status`, déclenchement génération rapport) se terminer en arrière-plan sans bloquer la navigation.
- Garder un guard pour éviter une double-finalisation.

**2. `src/pages/InterviewComplete.tsx`**
- Ajouter un état local `processing` (true par défaut).
- Au montage, lire `sessions.status` via `token` :
  - Si `status === 'completed'` → afficher l'écran final actuel.
  - Sinon → afficher un écran d'attente : spinner + titre "Enregistrement de votre session…" + sous-texte rassurant ("Merci de patienter quelques secondes, ne fermez pas cette page.").
- Poll toutes les 2s (ou Realtime sur la row `sessions`) jusqu'à `completed`, puis bascule sur l'écran final avec une animation fade-in.
- Timeout de sécurité : après 60s, afficher quand même l'écran final (le traitement continue côté serveur, le candidat n'a plus rien à faire).

### UI écran d'attente
Réutilise `CandidateLayout` + `Card` existants, dans le même style que l'écran final : pastille animée (loader au lieu du check), titre "Enregistrement de votre session…", message court.

### Test
Faire un entretien complet → vérifier :
1. La bascule vers l'écran d'attente est instantanée à la dernière question.
2. L'écran "Entretien terminé" s'affiche automatiquement une fois la session marquée `completed`.
3. Pas de régression sur la finalisation côté serveur (rapport bien généré).


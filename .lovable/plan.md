

## Plan — Durcissement architecture (Lots 1, 2, 3)

Exécution complète en autonomie pendant ton dîner. Trois lots enchaînés.

---

### Lot 1 — Hygiène (rapide, fort impact)

**1.1 Index BDD manquants** — migration SQL ajoutant des index sur les colonnes filtrantes critiques :
- `sessions(project_id)`, `sessions(token)`, `sessions(status)`
- `session_messages(session_id)`, `session_messages(question_id)`
- `reports(session_id)`
- `questions(project_id, order_index)`
- `evaluation_criteria(project_id)`
- `projects(organization_id)`, `projects(slug)`
- `user_roles(user_id, organization_id)`
- `transcripts(session_id)`

**1.2 Sélection de colonnes ciblée** — remplacer les `select("*")` les plus coûteux dans :
- `Dashboard.tsx`, `Projects.tsx`, `ProjectDetail.tsx`, `SessionDetail.tsx`, `Settings.tsx`
- Ne lister que les colonnes vraiment utilisées par le composant.

**1.3 Activation React Query** — créer un client centralisé et migrer les fetchs des 5 pages principales :
- Hooks dédiés par page (`useDashboardData`, `useProjects`, `useProject`, `useSession`, `useSettings`)
- `staleTime` raisonnable (30 s) + invalidation ciblée après mutations
- Conserver le comportement existant, juste ajouter le cache

---

### Lot 2 — Refacto `InterviewStart.tsx`

Découper le fichier de 2092 lignes en hooks et sous-composants, sans changer le comportement :

**Hooks extraits dans `src/hooks/interview/`** :
- `useInterviewSession.ts` — chargement session/projet/questions, statut, reprise
- `useMediaRecorder.ts` — caméra/micro, MediaRecorder, segments vidéo, retries upload
- `useSpeechRecognition.ts` — STT navigateur, redémarrage, transcript live
- `useInterviewTimer.ts` — durée max, compte à rebours, fin auto
- `useExamRoomLock.ts` — plein écran, beforeunload, popstate, heartbeat

**Sous-composants dans `src/components/interview/`** :
- `InterviewHeader.tsx` — barre supérieure avec progression et timer
- `QuestionDisplay.tsx` — bloc question + média + hint
- `MessagesPanel.tsx` — historique conversationnel
- `RecorderControls.tsx` — boutons enregistrer/pause/suivant
- `ResumePrompt.tsx` — écran « reprendre / recommencer »

`InterviewStart.tsx` devient un orchestrateur de ~300 lignes assemblant ces blocs. Aucune modification fonctionnelle, juste de la séparation.

---

### Lot 3 — Scalabilité moyen terme

**3.1 Pagination** :
- `Projects.tsx` : pagination 20 par page avec composant `Pagination` déjà disponible.
- `ProjectDetail.tsx` : pagination des sessions (20 par page).
- `AdminEmails.tsx` : pagination si pas déjà présent.

**3.2 Virtualisation des messages d'entretien** :
- Dans `MessagesPanel.tsx` (issu du Lot 2), n'afficher que les 30 derniers messages avec un bouton « Voir l'historique complet » qui charge le reste à la demande.
- Désactiver le scroll smooth au-delà de 50 messages.

**3.3 Logs structurés côté front** :
- Petit utilitaire `src/lib/logger.ts` avec niveaux (debug/info/warn/error) et contexte automatique (route, user_id, session_id si pertinent).
- Brancher sur les points critiques : erreurs upload, échecs IA, erreurs auth.
- Pas de Sentry pour l'instant (nécessite compte externe), mais code prêt à l'accueillir.

**3.4 Refacto `<ProjectForm>` partagé** :
- Extraire la logique commune de `ProjectNew.tsx` et `ProjectEdit.tsx` dans `src/components/project/ProjectForm.tsx`.
- Les deux pages deviennent de fines enveloppes (chargement initial + soumission).

---

### Hors champ

- Pas de Sentry ou outil de monitoring tiers (nécessite décision produit + compte externe).
- Pas de read replicas ni d'optimisation infra (prématuré).
- Pas de modification du moteur IA / rapport (sujet « Analyse 2.0 » séparé).
- Pas de refonte du flux candidat ni d'UX visible.

---

### Fichiers principaux touchés

- **Migration SQL** : indexes
- **Lot 1** : `Dashboard.tsx`, `Projects.tsx`, `ProjectDetail.tsx`, `SessionDetail.tsx`, `Settings.tsx`, nouveaux hooks dans `src/hooks/queries/`
- **Lot 2** : `InterviewStart.tsx` (réduit), nouveaux fichiers dans `src/hooks/interview/` et `src/components/interview/`
- **Lot 3** : `Projects.tsx`, `ProjectDetail.tsx`, `AdminEmails.tsx`, `src/components/interview/MessagesPanel.tsx`, `src/lib/logger.ts`, `src/components/project/ProjectForm.tsx`, `ProjectNew.tsx`, `ProjectEdit.tsx`

### Stratégie d'exécution

J'enchaîne les trois lots, en testant le build à chaque étape. Si un lot pose problème, je m'arrête, je documente et je laisse les précédents en place. Bon dîner.


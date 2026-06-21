## Objectif

Quand on ouvre le copilote depuis la page d'un rapport (`/sessions/:id`), il doit :
1. Détecter automatiquement le projet et le candidat — pas de sélecteur de projet.
2. Forcer le mode « Analyser les candidats ».
3. Proposer des suggestions de questions ciblées sur **ce candidat précis**.
4. Centrer toute la conversation sur ce candidat (le système prompt ne contient que son rapport, pas tous les candidats du projet).

## Détection du contexte

Dans `src/contexts/CopilotContext.tsx` :
- Ajouter le pattern `/sessions/:id` à la détection.
- Exposer `activeSessionId: string | null` en plus de `activeProjectId`.
- Sur une page session, résoudre `project_id` + `candidate_name` via un petit hook `useSessionContext(sessionId)` (lecture de `sessions` : `id, project_id, candidate_name`). Le résultat alimente `activeProjectId` quand on est sur `/sessions/:id`.
- Quand `activeSessionId` est défini, forcer `mode = "analysis"` et désactiver le sélecteur d'onglet (ou le masquer).

## UI

`CopilotPanelContent.tsx` :
- Si `activeSessionId`, ne pas afficher `CopilotProjectPicker` même sans projet picked — attendre la résolution puis afficher directement le chat.
- Afficher en en-tête une petite ligne contextuelle : `Candidat : {nom} — Projet : {titre}`.
- Masquer le sélecteur de mode (analyse/conception) sur une page session.

`CopilotChatWindow.tsx` :
- Recevoir un prop optionnel `sessionId` + `candidateName`.
- Nouvelle liste de suggestions quand `sessionId` est présent (4 items) :
  - « Quels sont les points forts et faiblesses de {nom} ? »
  - « Rédige 5 questions de relance à poser à {nom} en second entretien. »
  - « Quels axes approfondir sur le profil de {nom} ? »
  - « Compare {nom} à la moyenne des autres candidats du projet. »
- Modifier l'état vide : titre « Approfondir le profil de {nom} ».

## Threads scopés à la session

- Migration : ajouter `session_id uuid null references public.sessions(id) on delete cascade` à `copilot_threads` + index `(session_id)`.
- `useCopilotThreads` : nouveau paramètre optionnel `sessionId`. Quand fourni, filtrer `eq("session_id", sessionId)` ; sinon `is("session_id", null)` pour ne pas mélanger avec les conversations « projet entier ».
- `useCreateCopilotThread` : accepter `sessionId?` et l'insérer.
- `CopilotContext` : réinitialiser `activeThreadId` quand `activeSessionId` change.

## Edge function `copilot-chat`

- Lire `thread.session_id` en plus de `project_id`.
- En mode `analysis`, si `session_id` est présent :
  - Charger seulement la session ciblée (`sessions` + `reports` joints) au lieu de toutes les sessions du projet.
  - Adapter `buildAnalysisSystemPrompt` : prompt recentré sur **un seul candidat** (« Tu aides le recruteur à approfondir le profil de {nom} »), avec rapport complet (forces, axes, scores critères, soft skills, red flags, note recruteur), plus les critères du projet pour cadrer.
  - Auto-titre du thread : `Approfondir {nom}` à la première question si titre par défaut.

## Détails techniques

Fichiers modifiés :
- `src/contexts/CopilotContext.tsx` (détection `/sessions/:id`, résolution projet)
- `src/components/copilot/CopilotPanelContent.tsx` (pas de picker, en-tête contexte, mode forcé)
- `src/components/copilot/CopilotChatWindow.tsx` (suggestions candidat, prop session)
- `src/hooks/queries/useCopilot.ts` (paramètre `sessionId` sur threads + création)
- `supabase/functions/copilot-chat/index.ts` (branche analyse mono-candidat)
- Nouveau hook `src/hooks/queries/useSessionContext.ts` (lookup léger projet+nom à partir de l'id de session)

Migration SQL :
```sql
alter table public.copilot_threads
  add column session_id uuid null references public.sessions(id) on delete cascade;
create index copilot_threads_session_id_idx on public.copilot_threads(session_id);
```

Hors périmètre : pas de changement sur le mode « Conception », pas de refonte du panneau, pas de partage de conversations entre recruteurs.

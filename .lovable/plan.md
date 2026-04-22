

## Plan — Test E2E « Restart » nettoie la BDD

Ajouter une 5e spec Playwright qui vérifie que le bouton « Recommencer depuis le début » purge correctement la session côté base de données, pas seulement côté UI.

### Nouveau fichier

**`tests/e2e/interview-start-restart-cleanup.spec.ts`**

Scénario :
1. Aller sur `/interview/{slug}/start/{resumeSessionToken}` (session `in_progress` avec 2 messages déjà persistés et `last_question_index = 1`).
2. Vérifier l'état initial via Supabase REST :
   - 2 lignes dans `session_messages` pour `resumeSessionId`
   - `sessions.last_question_index = 1`
   - `sessions.status = 'in_progress'`
3. Attendre l'apparition du dialogue de reprise (`interview-resume-dialog`).
4. Cliquer sur `interview-resume-restart`.
5. Attendre le retour à l'écran d'accueil (`interview-start-screen`).
6. Re-vérifier la BDD via REST avec `expect.poll` :
   - 0 ligne dans `session_messages` pour `resumeSessionId`
   - `sessions.last_question_index = 0`
   - `sessions.status = 'pending'` (purge complète)

### Pré-requis vérifiés

- Le seed remet la session resume à 2 messages + `last_question_index=1` à chaque exécution → la spec est rejouable.
- Les `data-testid` `interview-resume-dialog`, `interview-resume-restart` et `interview-start-screen` existent déjà dans `InterviewStart.tsx`.
- Les policies RLS sur `sessions` et `session_messages` autorisent la lecture anon → la vérification via REST anon fonctionne.

### Mise à jour documentation

Ajouter une ligne dans `tests/e2e/README.md` au tableau des scénarios :
- `interview-start-restart-cleanup.spec.ts` — Candidat anon — « Recommencer » purge messages + reset index/status en BDD

### Fichiers touchés

- `tests/e2e/interview-start-restart-cleanup.spec.ts` (nouveau)
- `tests/e2e/README.md` (ligne ajoutée)

### Hors champ

- Pas de modification du code applicatif ni du seed (déjà prêt).
- Pas de vérification du nettoyage des fichiers media uploadés (sujet séparé).


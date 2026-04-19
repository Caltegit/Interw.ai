

## Plan — Tests E2E Playwright (Option A : seed manuel)

### Étape 1 — Données seed à créer en DB (via migration)

Je crée une migration SQL qui insère :
- **1 organisation test** : `E2E Test Org` (slug: `e2e-test-org`)
- **1 user RH test** : nécessite création via `auth.admin` → je le ferai via une edge function one-shot OU je te demande de le créer manuellement depuis Super Admin (plus simple). On stocke l'email en variable d'env.
- **1 projet seed** : slug `e2e-test-project`, statut `active`, 2 questions, 2 critères.
- **1 session seed avec transcript** : pour le test de génération de rapport. Status `completed`, avec quelques `session_messages` et un `transcripts` pré-rempli.

### Étape 2 — Helpers

**`tests/e2e/helpers/auth.ts`**
- `loginAsRH(page)` → va sur `/login`, remplit email/password depuis `process.env.E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`, attend redirection vers `/dashboard`.

**`tests/e2e/helpers/constants.ts`**
- Constantes : `E2E_PROJECT_SLUG = "e2e-test-project"`, `E2E_SESSION_ID` (UUID fixe défini dans la migration).

### Étape 3 — Les 3 specs

**`tests/e2e/project-creation.spec.ts`**
1. Login RH
2. `/projects/new` → wizard 4 étapes
3. Remplir poste + description, ajouter 2 questions + 2 critères depuis biblio
4. Valider
5. **Assert** : URL `/projects/:id`, titre visible, statut "active"
6. **Cleanup** : supprimer le projet créé en fin de test

**`tests/e2e/candidate-journey.spec.ts`** (anonyme, pas de login)
1. `/interview/e2e-test-project`
2. Remplir nom + email → "Continuer"
3. Skip intro media (cliquer "Commencer la session")
4. Sur `/test/:token` → cliquer "Passer" (mic/cam mockés impossibles en CI)
5. **Assert** : arrivée sur `/start/:token`, première question visible

**`tests/e2e/report-generation.spec.ts`**
1. Login RH
2. `/sessions/:E2E_SESSION_ID`
3. Cliquer "Générer le rapport"
4. Polling jusqu'à apparition du score (timeout 90s — l'IA peut être lente)
5. **Assert** : score global affiché, recommandation présente, ≥1 critère visible

### Étape 4 — Configuration

- Variables d'env requises : `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_BASE_URL` (preview Lovable).
- Doc rapide dans `tests/e2e/README.md` : comment lancer (`npx playwright test`), quels seeds existent, comment recréer un compte test si supprimé.

### Étape 5 — Limites assumées

- **Pas de test du flow audio complet** (WebRTC + Whisper trop coûteux/flaky en CI). Le candidate journey s'arrête à l'écran d'entretien.
- **Pas de CI configurée** : tu lances à la main avec `npx playwright test`.
- **Cleanup partiel** : seul le projet créé dans le scénario 1 est supprimé. Les seeds restent en place pour réutilisation.

### Question avant de coder

Pour le user RH test, deux options :
- **A1** : tu le crées toi-même depuis Super Admin (1 min) avec un email dédié type `e2e-test@interw.ai`, et tu me donnes l'email + mdp pour les mettre en env.
- **A2** : je crée une edge function one-shot `seed-e2e-user` qui le crée automatiquement (avec mdp fixe). Plus pratique mais ajoute du code.

Lequel préfères-tu ?


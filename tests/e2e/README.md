# Tests E2E Playwright

Scénarios critiques couvrant les flux métier principaux.

## Setup (une fois)

Aucune action manuelle — le seed est automatique au lancement des tests via
`global-setup.ts` qui appelle l'edge function `seed-e2e-user`.

Cette function crée (idempotent) :
- Un user RH test : `e2e-test@interw.ai` / `E2eTest!2026`
- Une org `E2E Test Org`
- Un projet seed `e2e-test-project` (2 questions, 2 critères)
- Une session **complétée** avec transcript (pour le rapport)
- Une session **pending** dédiée aux tests de l'écran d'entretien
- Une session **in_progress** (avec messages persistés) pour tester la reprise

## Variables d'env (optionnelles)

Par défaut les valeurs sont en dur dans `helpers/constants.ts`. Pour override :

```bash
E2E_TEST_EMAIL=e2e-test@interw.ai
E2E_TEST_PASSWORD=E2eTest!2026
E2E_BASE_URL=https://id-preview--d507061f-79c5-4010-a44e-dcd95586a736.lovable.app
```

## Lancer les tests

```bash
# Tous les tests
npx playwright test

# Un seul fichier
npx playwright test tests/e2e/project-creation.spec.ts

# En mode UI interactif
npx playwright test --ui
```

## Scénarios

| Fichier | Acteur | Couvre |
|---|---|---|
| `project-creation.spec.ts` | RH connecté | Wizard création projet (4 étapes) → projet créé |
| `candidate-journey.spec.ts` | Candidat anon | Landing → arrivée écran entretien |
| `report-generation.spec.ts` | RH connecté | Génération rapport IA depuis session complétée |
| `interview-start-loading.spec.ts` | Candidat anon | Écran « Prêt à démarrer ? » charge sans erreur |
| `interview-start-resume.spec.ts` | Candidat anon | Reprise d'une session interrompue + persistance après refresh |
| `interview-start-media.spec.ts` | Candidat anon | `getUserMedia` + `MediaRecorder` activés (flux factices Chromium) |
| `interview-start-refresh.spec.ts` | Candidat anon | Session passe en `in_progress`, survit au refresh, recommencement OK |
| `interview-start-restart-cleanup.spec.ts` | Candidat anon | « Recommencer » purge `session_messages` + reset `last_question_index`/`status` en BDD |
| `interview-start-restart-media-cleanup.spec.ts` | Candidat anon | « Recommencer » purge aussi les fichiers media uploadés (`interviews/{sessionId}/`) |

## Limites assumées

- **Conversation IA** (`ai-conversation-turn`) : non déterministe, hors scope régression UI.
- **TTS ElevenLabs / browser** : flaky en headless, déjà loggé/géré côté code.
- **Reconnaissance vocale (STT)** : impossible sans vrai micro humain — on ne teste donc pas la
  navigation entre questions via la voix candidate.
- **Analyse vidéo finale** : couverte indirectement par `report-generation.spec.ts`.
- Pas de CI configurée — lancement manuel.
- Le projet créé par `project-creation` n'est pas auto-supprimé : nettoyer manuellement si besoin.

## Configuration spécifique

`playwright.config.ts` lance Chromium avec :
- `permissions: ["camera", "microphone"]`
- flags `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`,
  `--autoplay-policy=no-user-gesture-required`

… afin que `getUserMedia` reçoive un flux audio/vidéo simulé sans intervention.

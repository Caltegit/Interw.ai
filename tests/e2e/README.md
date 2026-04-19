# Tests E2E Playwright

3 scénarios critiques couvrant les flows métier principaux.

## Setup (une fois)

Aucune action manuelle — le seed est automatique au lancement des tests via
`global-setup.ts` qui appelle l'edge function `seed-e2e-user`.

Cette function crée (idempotent) :
- Un user RH test : `e2e-test@interw.ai` / `E2eTest!2026`
- Une org `E2E Test Org`
- Un projet seed `e2e-test-project` (2 questions, 2 critères)
- Une session complétée avec transcript

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

## Limites assumées

- Pas de test du flow audio complet (WebRTC + Whisper trop coûteux en headless).
- Pas de CI configurée — lancement manuel.
- Le projet créé par `project-creation` n'est pas auto-supprimé : nettoyer manuellement si besoin.

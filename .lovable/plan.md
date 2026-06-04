## Objectif
Allonger ×3 la phrase à prononcer lors du test micro (test technique avant entretien).

## Changement
Dans `src/pages/InterviewDeviceTest.tsx` (ligne 55), remplacer :

```ts
const MIC_TEST_PHRASE = "Bonjour, je suis prêt pour l'entretien.";
```

par une phrase ~3× plus longue (~22 mots → ~12-14s de lecture), par exemple :

```ts
const MIC_TEST_PHRASE =
  "Bonjour, je suis prêt pour démarrer l'entretien. Je vérifie que mon micro fonctionne correctement et que ma voix est bien captée par la plateforme avant de commencer.";
```

## Hors périmètre
- Pas de modification de `MIC_THRESHOLDS.TEST_DURATION_MS` (6s) — la fenêtre de capture reste suffisante puisque le candidat parle dès le début de la lecture.
- Aucun autre fichier impacté.
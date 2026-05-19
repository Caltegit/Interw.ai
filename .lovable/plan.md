## Objectif

Aujourd'hui, `InterviewDeviceTest` affiche les 5 cartes de test simultanément (Navigateur, Micro, Son, Reconnaissance vocale, Connexion). Beaucoup de candidats sont perdus : ils ne savent pas par où commencer, cliquent dans le désordre, ratent un test silencieux.

On passe à un **parcours guidé étape par étape** : une seule étape visible à la fois, le candidat ne voit l'étape suivante que quand l'actuelle est validée (ou skippée).

## Parcours proposé

```text
[Étape 1/5] Navigateur compatible      → auto-check au chargement
[Étape 2/5] Caméra                     → auto-démarre
[Étape 3/5] Micro et enregistrement    → bouton « Tester » + lecture phrase
[Étape 4/5] Son (bip)                  → bouton « Tester »
[Étape 5/5] Connexion réseau           → auto-démarre
       ↓
  Récap (les 5 ✓) + bouton « Continuer »
```

Règles :
- Une seule carte de test affichée à la fois, en grand, centrée.
- Un **stepper** en haut (1/5, 2/5…) montre la progression.
- Auto-avance vers l'étape suivante dès qu'un test passe en `ok` (délai 800 ms pour laisser voir le ✓).
- En cas d'`error` ou `warning` : on reste sur l'étape, on affiche le bouton « Réessayer » + un lien discret « Passer cette étape » (sauf navigateur bloqué qui reste bloquant).
- Le test STT (reconnaissance vocale) reste exécuté en arrière-plan pendant l'étape Micro — il n'a pas sa propre étape visible sauf s'il échoue (alors il s'intercale en étape bloquante).
- Écran final récap : les 5 lignes condensées avec leur statut + bouton « Commencer l'entretien ».

## Bénéfices

- Charge cognitive réduite : un test = une action claire.
- Plus de tests oubliés (le candidat scrollait et ratait le réseau ou le son).
- Meilleur taux de complétion réelle du test micro (cause #1 des incidents).

## Détails techniques

Fichier touché : `src/pages/InterviewDeviceTest.tsx` uniquement. Pas de changement de logique de test (`testMicAndRecorder`, `testNetwork`, `testStt`, `testSound`, `browserCompat` restent identiques), pas de migration BDD, pas d'edge function.

Ajouts :
- État `currentStep: "browser" | "camera" | "mic" | "sound" | "network" | "recap"`.
- `useEffect` qui observe les `status` et avance automatiquement (avec délai et anti-rebond).
- Petit composant `Stepper` (5 pastilles + label de l'étape courante).
- Refacto rendu : remplacer la `div.space-y-2.5` qui empile les 5 `TestCard` par un `switch (currentStep)` qui rend une seule carte à la fois, gardée dans un container `max-w-md mx-auto` avec une animation `fade-in`.
- Écran récap = liste compacte (icône + label + statut) + CTA `Commencer l'entretien` (le CTA déjà présent en bas est conservé, on le déplace dans le récap).
- Le bouton « Passer cette étape » n'apparaît que pour mic/son/réseau et marque le test comme `skipped` (nouveau état Status) pour que la session puisse démarrer en best-effort (le filet de sécurité côté `InterviewStart` est déjà là).

Tests E2E à mettre à jour : `interview-start-loading.spec.ts` et `candidate-journey.spec.ts` ne touchent pas le device test directement, donc aucun impact. À vérifier après implémentation.

## Hors champ

- Aucun changement sur `InterviewStart` ni sur les fonctions de mesure.
- Pas de modification de la logique d'auto-test au chargement (caméra, réseau, STT démarrent toujours en parallèle en background ; on n'affiche juste qu'une étape à la fois).
- Pas de redesign visuel des cartes elles-mêmes (palette, typo, layout interne conservés).

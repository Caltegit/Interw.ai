# Supprimer le flash de la première question au démarrage de session

## Le problème

Après le clic sur « Lancer la session », le candidat voit pendant ~1,5 s l'écran de la première question, puis l'overlay de préparation, puis revient à la première question. C'est visuellement chaotique.

## La cause

Dans `src/pages/InterviewStart.tsx`, la fonction `beginInterview()` :

1. ligne 2002 — `setReadyToStart(true)` → l'UI principale (avec la Q1) devient affichable
2. lignes 2010 → 2049 — trois `await` successifs (fullscreen, getUserMedia, mesure micro **1 500 ms hardcodés**)
3. ligne 2113 — `setBootActive(true)` → l'overlay `InterviewBootProgress` s'affiche enfin

Entre les étapes 1 et 3, React a le temps de peindre l'écran d'entretien (Q1 visible). L'overlay arrive ensuite par dessus, donnant le « flash » puis le « retour » à la Q1.

## La solution

Activer l'overlay de préparation **dans le même tick** que `setReadyToStart(true)`, avant tout `await`. L'ordre des opérations asynchrones (audio unlock iOS, fullscreen, getUserMedia, mesure micro) ne change pas — seul l'ordre des `setState` change.

### Changements (1 seul fichier)

**`src/pages/InterviewStart.tsx` — fonction `beginInterview()` (lignes 1948–2113)**

- Juste après `setReadyToStart(true)` (ligne 2002), ajouter immédiatement :
  - `setBootSteps(initialSteps)` (la liste initiale d'étapes existe déjà plus bas)
  - `setBootPercent(0)`
  - `setBootActive(true)`
- Supprimer la duplication de ces 3 lignes aujourd'hui en 2111–2113 (déplacées en amont).
- Conserver à l'identique : l'unlock audio iOS synchrone, `requestFullscreen()`, `startVideoStream()`, `measureMicLevel(1500ms)`, l'update Supabase, et tout ce qui suit l'overlay (progression, complétion des étapes, `setBootActive(false)`, démarrage de la Q1).

### Pourquoi c'est sûr

- Aucune logique métier n'est modifiée : l'ordre des `await` et tous les effets de bord (audio unlock, fullscreen, médias, micro, Supabase, heartbeat, démarrage Q1) restent strictement identiques.
- L'overlay `InterviewBootProgress` est déjà conçu pour rester monté jusqu'à `setBootActive(false)` en fin de préparation — on ne fait qu'avancer son apparition.
- `readyToStart` reste à `true` au même moment, donc le geste utilisateur iOS continue de débloquer l'audio dans le bon callstack.
- Aucun changement sur `InterviewLanding`, `InterviewDeviceTest`, `InterviewComplete`, ni sur le flux de questions suivantes.

## Vérification

Après l'implémentation, je testerai en preview :
1. Démarrage d'une session candidat de bout en bout : on doit passer directement de « Lancer la session » à l'écran de préparation, sans voir la Q1.
2. Fin de préparation : la Q1 doit s'afficher normalement, l'IA doit parler, le chrono démarrer.
3. Passage à la Q2 puis fin d'entretien : comportement inchangé.
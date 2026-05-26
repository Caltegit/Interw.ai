# Plan — supprimer définitivement l’apparition de la Q1 avant la préparation

## Problème constaté
Au lancement de la session candidat, la première question reste visible (au moins partiellement) avant que l’écran de préparation prenne le relais. La correction précédente activait bien l’overlay tôt, mais l’overlay est translucide et l’UI de la Q1 (vidéo / avatar / contrôles) se monte en arrière-plan dès `readyToStart`, ce qui laisse percevoir la question derrière le voile flouté.

## Objectif
Faire en sorte que pendant toute la phase de préparation :
- seul l’écran de préparation soit affiché,
- l’UI de l’entretien (Q1, avatar, lecteur vidéo de la question, panneau de droite, etc.) ne se monte qu’une fois la préparation terminée.

Et garantir qu’une fois la préparation finie, tout le reste du flux fonctionne **exactement** comme aujourd’hui : caméra, micro, TTS, lecture de la 1ʳᵉ question, suite des questions, fin de session.

## Modifications prévues
1. **Conserver l’activation précoce de l’overlay** déjà en place dans `beginInterview()` (rien à changer dans la logique de démarrage : audio mobile, plein écran, caméra, mesure micro, timers, étapes de boot).
2. **Empêcher le rendu de l’UI d’entretien tant que `bootActive` est vrai**, dans `src/pages/InterviewStart.tsx` :
   - Pendant `bootActive`, on n’affiche que l’overlay de préparation et les éléments globaux qui doivent rester actifs (consentement, debug audio).
   - Le bloc principal (avatar IA / lecteur de question / colonne de droite / barre de progression de question) n’est monté qu’à la fin de la préparation, exactement comme c’est le cas aujourd’hui une fois l’overlay retiré.
3. **Ne rien changer aux refs et au flux caméra**. La self-view utilise un ref callback qui rattache automatiquement le flux dès qu’elle se monte ; donc retarder le montage jusqu’à la fin du boot ne casse pas la caméra.

## Vérifications à faire après modification
- Au clic « Lancer la session » : l’écran de préparation apparaît immédiatement, sans aucune trace visuelle de la Q1.
- À la fin de la préparation : la Q1 s’affiche normalement (vidéo / avatar selon le type), le greeting est lu, le micro écoute.
- Suite de la session : passage aux questions suivantes, pause/reprise, fin de session — identiques à aujourd’hui.
- Cas plein écran refusé, mobile, question texte vs audio vs vidéo : pas de régression.

## Détails techniques
- Fichier ciblé : `src/pages/InterviewStart.tsx`.
- Le rendu principal (lignes ~3574 et suivantes) reste structurellement identique ; on ajoute simplement une condition pour ne pas mouter le conteneur `mx-auto w-full max-w-7xl …` tant que `bootActive` est vrai.
- Les overlays globaux (boot progress, audio unlock, prompt plein écran, badge d’enregistrement) restent gérés comme aujourd’hui.
- Aucune modification dans la logique métier (`beginInterview`, `startVideoStream`, `setBootActive(false)`, persistance du greeting, TTS, transcription) : seul le découpage d’affichage change.
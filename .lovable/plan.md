# Améliorer le test micro (étape « Micro et enregistrement »)

Fichier concerné : `src/pages/InterviewDeviceTest.tsx`, bloc `currentStep === "mic"` (lignes ~930-1010). Aucune logique métier modifiée — uniquement la présentation pendant la phase `micStatus === "testing"` et l'état `idle`.

## Changements UI

**1. Phrase à lire — plus grosse et lisible**
- Passer la phrase de `text-sm` à `text-lg` (voire `text-xl` sur desktop), conserver l'italique et le cadre.
- Ajouter un peu plus de padding vertical pour qu'elle respire.

**2. Bouton « Tester mon micro » (état idle) qui attire l'œil**
- Bouton plus grand (`h-12`, `text-base`) avec icône micro plus grosse.
- Animation de pulsation discrète (`animate-pulse` sur un halo derrière le bouton) pour signaler que c'est l'action à faire.

**3. Indicateur « Parlez maintenant » pendant le test**
- Remplacer le petit texte « Lisez la phrase à voix haute… » par un bandeau visible :
  - Icône micro qui pulse (rouge/primary)
  - Texte « Parlez maintenant » en `text-base font-semibold`
  - Compte à rebours à droite, plus grand (`text-sm` → `text-base font-mono`)

**4. Vu-mètre segmenté plus clair**
- Remplacer la barre fine actuelle (2px de haut) par une jauge segmentée façon `MicLevelMeter` :
  - 12 à 16 segments verticaux d'environ 24-32px de haut
  - Couleur progressive : gris → primary → succès quand on parle assez fort
  - Animation fluide qui réagit au volume capté (`micLevel` déjà disponible)
- Ajouter sous la jauge un micro-texte d'état dynamique :
  - « En attente de votre voix… » si `micLevel < 0.05`
  - « Parfait, continuez ! » si `micLevel >= 0.15`

## Détails techniques

- Réutiliser la valeur `micLevel` déjà mise à jour dans la boucle d'analyse (ligne 294) — pas de nouveau AudioContext.
- Les segments se calculent : `Math.round(micLevel * SEGMENTS)`, identique au pattern de `src/components/project/MicLevelMeter.tsx`.
- Conserver tous les seuils, callbacks et flux d'erreur existants (`micStatus`, `micError`, `micWarning`, `testMicAndRecorder`).
- Aucun changement de tokens du design system : on utilise `--l-accent`, `--primary`, `--success` déjà en place.

## Hors périmètre

- Pas de changement aux étapes Caméra, Son, STT, Réseau.
- Pas de changement à la logique de mesure (`measureMicLevel`, seuils `MIC_THRESHOLDS`).
- Pas de modification de la phrase `MIC_TEST_PHRASE`.

## Vérification

- Visuel via le preview : étape micro en `idle` → bouton pulse. Au clic → bandeau « Parlez maintenant » + jauge segmentée réactive.
- Vérifier que les états `error` et `warning` restent inchangés.

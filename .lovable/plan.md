## Objectif
Harmoniser le vocabulaire côté candidat : remplacer toutes les occurrences de « entretien » par « session » sur les écrans de réservation/accueil, pendant la session, et de confirmation.

## Fichiers à modifier

### 1. `src/pages/InterviewStart.tsx`
- L. 320 : `"Entretien mis en pause"` → `"Session mise en pause"`
- L. 2868 : `"Entretien terminé"` → `"Session terminée"`
- L. 3184 : `"Choisissez ce que vous souhaitez faire de cet entretien :"` → `"Choisissez ce que vous souhaitez faire de cette session :"`

### 2. `src/components/interview/ConsentDialog.tsx`
- L. 32 : `"Pendant cet entretien pour …"` → `"Pendant cette session pour …"`
- L. 51 : `"peuvent consulter votre entretien et le rapport généré"` → `"peuvent consulter votre session et le rapport généré"`
- L. 87 : `"Vous pouvez interrompre l'entretien à tout moment"` → `"Vous pouvez interrompre la session à tout moment"`

## Hors-périmètre
- Pages RH/admin (Dashboard, ProjectDetail, etc.) ne sont pas modifiées.
- Les scènes Remotion (vidéo de démo) ne sont pas modifiées.
- Les libellés `InterviewLanding.tsx` et `InterviewCancelled.tsx` utilisent déjà « session ».

## Vérification
Après application : `rg -i "entretien" src/pages/Interview*.tsx src/components/interview/` ne doit plus rien retourner.

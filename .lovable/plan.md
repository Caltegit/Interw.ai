# Landing : cartouche « Sur devis » enrichie avec les inclus

## Objectif

Dans le bloc unique « Sur devis » de la section tarifs, ajouter la liste des inclus (entretiens, postes, utilisateurs, etc.) pour rappeler ce que comprend l'offre.

## Changements prévus

### Fichiers i18n

- `src/i18n/locales/fr/pricing.json` : ajouter `custom.features` (tableau) :
  - « Entretiens illimités »
  - « Postes illimités »
  - « Utilisateurs illimités »
  - « Rapports et transcriptions complets »
  - « Accompagnement personnalisé »
- `src/i18n/locales/en/pricing.json` : équivalents anglais :
  - « Unlimited interviews »
  - « Unlimited job positions »
  - « Unlimited users »
  - « Full reports and transcripts »
  - « Dedicated support »

### `src/pages/Landing.tsx`

- Sous le sous-titre `custom.subtitle`, afficher la liste `custom.features` en colonne centrée : icône `Check` (lucide, déjà disponible) + libellé, style `text-muted-foreground`, sans changer le titre, le bouton ni l'ancre `#tarifs`.

## Vérification

- Build OK.
- Capture de la section tarifs en FR : bloc « Sur devis » avec la liste des inclus au-dessus du bouton.

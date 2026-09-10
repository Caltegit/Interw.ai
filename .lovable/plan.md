# Landing : conserver uniquement l’ancienne cartouche Entreprise

## Objectif

Reprendre la cartouche Entreprise de l’ancienne grille tarifaire, avec sa présentation en lignes, et l’afficher seule dans la section tarifs.

## Changements prévus

### `src/pages/Landing.tsx`

- Remplacer le bloc simplifié actuel par une seule cartouche reprenant exactement la structure visuelle des anciennes cartes tarifaires :
  - nom « Entreprise » ;
  - prix « Sur devis » ;
  - bouton « Parler à l’équipe » vers le calendrier existant ;
  - lignes séparées « Entretiens / mois : Illimités », « Au-delà : Tarif négocié », « Postes actifs simultanés : Illimités » et « Utilisateurs : Illimités ».
- Centrer cette cartouche seule, sans rétablir les autres offres, le basculement mensuel/annuel ni le bandeau promotionnel.
- Conserver le titre de section, l’ancre `#tarifs` et le style actuel de la landing.

### Fichiers i18n

- `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` : rétablir uniquement les libellés nécessaires à cette cartouche Entreprise et leurs équivalents anglais.

## Vérification

- Build OK.
- Capture de la section tarifs en FR et EN : une seule ancienne cartouche Entreprise détaillée et correctement centrée.

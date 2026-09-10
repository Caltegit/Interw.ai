# Landing : remplacer la section tarifs par un accès bêta sans prix

## Objectif

Interw est en phase bêta avec un embarquement gratuit. Afficher un pricing non finalisé — même sous forme « Sur devis » — peut bloquer ou détourner des prospects. La section `#tarifs` est remplacée par un simple bloc d’accès privé orienté prise de contact, sans montant.

## Décisions confirmées

- Pas de prix affiché (0 €, forfait, au-delà, tarif négocié, etc.).
- Garder l’ancre `#tarifs` et le lien « Tarifs » dans la navbar pour ne pas casser les liens existants.
- Titre de section plus adapté à la phase : « Accès privé » / « Private access ».
- Bloc simple : titre, court sous-titre, CTA vers le calendrier existant (`CAL_LINK`).

## Changements prévus

### `src/pages/Landing.tsx`

- Remplacer le bloc tarifaire actuel par un bloc centré dans la section `#tarifs` :
  - titre via `tp("title")` (nouvelle valeur « Accès privé ») ;
  - sous-titre via `tp("beta.subtitle")` ;
  - CTA via `tp("beta.cta")` vers `CAL_LINK`.
- Supprimer toutes les références à `custom.title`, `custom.subtitle`, `custom.cta` si elles ne sont plus utilisées ailleurs.
- Conserver l’ancre `id="tarifs"` et le lien de navigation.

### Fichiers i18n

- `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` :
  - remplacer `title` par « Accès privé » / « Private access » ;
  - ajouter `beta.subtitle` et `beta.cta` ;
  - supprimer les clés `custom.*`, `onQuote` et `plans` si elles ne sont utilisées que ici.

### `src/index.css`

- Ne retirer aucun style utilisé ailleurs. Vérifier que les anciennes classes tarifaires n’ont pas d’impact.

## Vérification

- Build OK.
- Capture de la section `#tarifs` en FR et EN : titre « Accès privé » / « Private access », pas de prix, CTA vers le calendrier.
- Vérifier que le lien « Tarifs » dans la navbar amène toujours à la section.

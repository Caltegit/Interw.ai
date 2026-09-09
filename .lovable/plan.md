# Landing : section tarifs remplacée par un bloc unique « Sur devis »

## Objectif

Remplacer la grille des 4 cartouches tarifaires de la landing par un seul bloc centré « Sur devis », avec le message « On s'adapte à vos besoins ».

## Décisions confirmées

- Libellé principal : **« On s'adapte à vos besoins »**.
- CTA : **« Parler à l'équipe » / « Book a demo »**, lien vers le calendrier existant.
- Bandeau « 10 entretiens offerts » : **supprimé**.
- Toggle Mensuel / Annuel : **supprimé**.
- Titre de section : conserve les clés existantes `pricing.title`.
- Style : reprend les classes et tokens déjà utilisés sur la landing (pas de nouvelle direction graphique).

## Changements prévus

### `src/pages/Landing.tsx`

- Supprimer le state `billing` et le toggle mensuel/annuel.
- Supprimer le bandeau « 10 entretiens offerts ».
- Remplacer la grille `PLAN_KEYS` et le composant `PlanPrice` par un bloc unique centré :
  - Titre `tp("title")`.
  - Sous-titre « Sur devis » / « Custom ».
  - Phrase « On s'adapte à vos besoins ».
  - Bouton « Parler à l'équipe » / « Book a demo » vers `CAL_LINK`.
- Supprimer `PLAN_KEYS` et `PlanPrice` du fichier s'ils n'y sont utilisés qu'ici.
- Conserver l'ancre `id="tarifs"` et le lien dans la navigation.

### Fichiers i18n

- `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` :
  - Ajouter les clés `custom.title` et `custom.subtitle`.
  - Supprimer les clés devenues inutiles : `monthly`, `annual`, `twoMonthsFree`, `note`, `recommended`, `forever`, `billedMonthly`, `billedAnnually`, `annualCommitment`, `annualOnly`, `perMonth`, `perYear`, `freeOffer`, `specs.*`, `values.*`, `plans.free`, `plans.plus`, `plans.pro`.
  - Conserver `title`, `onQuote` et `plans.enterprise`.

### `src/index.css`

- Si des styles ou keyframes liés à l'animation des prix ne sont plus utilisés ailleurs, les retirer.

## Vérification

- Build OK.
- Capture d'écran de la section tarifs en FR et EN : un seul bloc centré, sans toggle ni bandeau, avec le message et le CTA.
- Vérifier que le lien d'ancre « Tarifs » dans la navbar amène toujours à la section.

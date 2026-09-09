# Landing : section tarifs remplacée par un bloc unique « Sur devis »

## Objectif

Remplacer la grille de 4 cartouches tarifaires de la landing par un seul bloc centré « Sur devis / Custom », avec le message « On s'adapte à vos besoins ».

## Décisions confirmées

- Libellé principal : **« On s'adapte à vos besoins »**.
- CTA : **« Parler à l'équipe » / « Book a demo »**, lien vers le calendrier existant (`CAL_LINK`).
- Bandeau « 10 entretiens offerts » : **supprimé**.
- Toggle Mensuel / Annuel : **supprimé**.
- Titre de section : conserve les clés existantes `pricing.title` (« Nos tarifs » / « Pricing »).

## Changements prévus

### `src/pages/Landing.tsx`

- Supprimer le state `billing` et le toggle mensuel/annuel.
- Supprimer le bandeau « 10 entretiens offerts ».
- Remplacer la grille `PLAN_KEYS` par un bloc unique centré :
  - Titre `tp("title")`.
  - Bloc avec intitulé « Sur devis » / « Custom ».
  - Phrase « On s'adapte à vos besoins ».
  - Bouton « Parler à l'équipe » / « Book a demo » vers `CAL_LINK`.
- Supprimer `PlanPrice` et `PLAN_KEYS` s'ils ne sont utilisés nulle part ailleurs dans le fichier.
- Conserver l'ancre `id="tarifs"` et le lien dans la navigation.

### Fichiers de traduction

- `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` :
  - Supprimer les clés devenues inutiles : `monthly`, `annual`, `twoMonthsFree`, `note`, `recommended`, `forever`, `billedMonthly`, `billedAnnually`, `annualCommitment`, `annualOnly`, `perMonth`, `perYear`, `freeOffer`, `specs.*`, `values.*`, `plans.free`, `plans.plus`, `plans.pro`.
  - Conserver `title`, `onQuote`, `plans.enterprise` (nom + CTA) si pertinent, ou ajouter une nouvelle clé dédiée au bloc sur devis (`custom.title`, `custom.subtitle`, `custom.cta`).

### `src/index.css`

- Si une keyframe ou classe liée à l'animation des prix (`price-roll`, `animate-fade-in` de la section tarifs) n'est plus utilisée ailleurs, la retirer.

## Vérification

- Build OK (`bun run build`).
- Capture d'écran de la section tarifs en FR et EN : un seul bloc centré, sans toggle ni bandeau, avec le message et le CTA.
- Vérifier que le lien d'ancre « Tarifs » dans la navbar amène toujours à la section.

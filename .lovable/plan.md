# Landing : suppression de la section pricing et des liens de headbar

## Objectif

La page d’accueil devient une vitrine simple qu’on fait défiler jusqu’en bas. On retire tout ce qui oriente vers la section tarifs et les liens de navigation dans l’en-tête.

## Décisions confirmées

- La section `#tarifs` est supprimée entièrement.
- Les liens « Produit » et « Tarifs » disparaissent du header.
- Aucun autre lien de navigation n’est ajouté dans le header : il ne reste que le logo Interw.
- Le calendrier de démo reste accessible dans le hero, la clôture et le footer.

## Changements prévus

### `src/pages/Landing.tsx`

- Dans le header :
  - supprimer le bloc `<nav>` contenant les liens `#produit` et `#tarifs` ;
  - supprimer le bloc de droite contenant le lien « Se connecter » et le CTA « Réserver une démo » ;
  - ne garder que le logo cliquable vers `/`.
- Supprimer la section `{/* ============ TARIFS ============ */}` et tout son contenu.
- Retirer l’import/useTranslation `tp` (`useTranslation("pricing")`) si la section tarifs était son seul usage.
- Conserver `#produit` section et les ancres internes existantes si elles sont utilisées ailleurs.

### Fichiers i18n

- `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` : ne pas supprimer sans vérifier, mais ils ne seront plus importés depuis `Landing.tsx`.
- Vérifier que `t("nav.product")` et `t("nav.pricing")` ne sont plus utilisés dans cette page ; si ce sont leurs seuls usages, ils pourront être supprimés des fichiers `landing.json` dans un second temps.

## Vérification

- Build OK.
- Capture de la landing en haut de page : header minimal avec seulement le logo, pas de liens.
- Capture de la landing complète : aucun bloc tarifaire entre Produit et FAQ.
- La FAQ reste bien visible en dessous de la section précédente.

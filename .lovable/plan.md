# Suppression de la page /produit

## Objectif
Retirer complètement la page Produit (héritée de l'ancienne landing) sans casser la landing actuelle ni le routing.

## État actuel (vérifié)
- `src/pages/Produit.tsx` : la page elle-même, montée sur la route `/produit` dans `src/App.tsx:99`.
- Lien vers `/produit` dans la navbar de la landing (`src/pages/Landing.tsx:232-234`, libellé `nav.product`).
- Clés i18n `productPage.*` dans `src/i18n/locales/fr/landing.json` et `src/i18n/locales/en/landing.json` (utilisées uniquement par Produit.tsx), plus `nav.product` utilisé par la navbar.
- 6 images `src/assets/product-*.png` importées par Produit.tsx. **3 d'entre elles sont aussi utilisées par Landing.tsx** (les blocs "fonds peinture") et doivent être conservées.

## Actions

### 1. Supprimer la page et sa route
- Supprimer `src/pages/Produit.tsx`.
- Dans `src/App.tsx` : retirer l'import `Produit` (ligne 32) et la route `<Route path="/produit" .../>` (ligne 99).

### 2. Retirer le lien "Produit" de la landing
- Dans `src/pages/Landing.tsx` : supprimer le `<Link to="/produit">` de la navbar (lignes 232-234). La nav ne garde que "Tarifs", le sélecteur de langue, "Se connecter" et le CTA.

### 3. Nettoyer l'i18n
- `src/i18n/locales/fr/landing.json` et `en/landing.json` : supprimer le bloc `productPage` (inutilisé après suppression) et la clé `nav.product` (inutilisée après retrait du lien).
- Aucune autre langue ni namespace touché.

### 4. Nettoyer les assets
- Supprimer les 3 images utilisées **uniquement** par Produit : `product-project-detail.png`, `product-questions.png`, `product-criteria.png`.
- **Conserver** `product-dashboard.png`, `product-projects.png`, `product-report.png` : elles sont utilisées par les blocs peinture de Landing.tsx.

## Comportement après suppression
- L'URL `/produit` tombera sur la route catch-all (page 404 existante). Le SPA fallback d'hébergement sert index.html, donc aucun risque d'erreur serveur.
- Aucune autre page, email ou Edge Function ne référence `/produit`.

## Vérifications
- Build OK (aucun import cassé).
- Recherche finale `rg "/produit|Produit"` : zéro résultat hors historique.
- Test navigateur : la landing s'affiche sans le lien "Produit", `/produit` renvoie la 404 de l'app, les 3 blocs peinture de la landing affichent toujours leurs images.

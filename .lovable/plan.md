# Couper le lien vers /produit depuis la landing

## Objectif
Ne plus jamais atterrir sur `https://interw.com/produit` en cliquant sur "Produit" dans le menu de la landing. On ne supprime rien — la page `Produit.tsx` et sa route `/produit` restent intactes, par sécurité.

## État actuel (vérifié)
- La landing `src/pages/Landing.tsx` contient **un seul** lien vers `/produit` : la navbar, ligne 232-234.
- Libellé du lien : `t("nav.product")` ("Produit" / "Product").
- Aucun lien `/produit` ailleurs dans `Landing.tsx` (pas de footer, pas d'autres boutons).
- La route `/produit` et la page `Produit.tsx` ne sont **pas** touchées.

## Action unique
Dans `src/pages/Landing.tsx`, retirer le bloc :
```tsx
<Link to="/produit" className="hover:text-foreground transition-colors">
  {t("nav.product")}
</Link>
```
La navbar ne garde que "Tarifs", le sélecteur de langue, "Se connecter" et le CTA démo.

## Ce qu'on ne fait pas
- On ne supprime pas `Produit.tsx`.
- On ne touche pas à la route `/produit` dans `App.tsx`.
- On ne supprime pas les clés i18n `productPage` / `nav.product`.
- On ne supprime pas les assets `product-*.png`.

## Effet
- Cliquer sur "Produit" dans le menu n'existe plus → impossible d'arriver sur `/produit` depuis la landing.
- L'URL `/produit` reste accessible si on la tape directement (sécurité : rien de cassé si un lien externe pointe encore dessus).
- La page `Produit.tsx` reste disponible pour réactivation ultérieure.

## Vérification
- Build OK.
- Test navigateur : la navbar de la landing n'affiche plus "Produit" ; `/produit` répond toujours si on y va directement.

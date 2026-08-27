# Rendre le bouton "Produit" inactif (sans supprimer)

## Objectif
Le bouton "Produit" reste visible dans la navbar de la landing (pour ne pas laisser la navbar trop vide), mais il ne mène plus vers `/produit`. On ne supprime rien — ni la page, ni la route, ni le bouton.

## État actuel (vérifié)
- `src/pages/Landing.tsx` ligne 232-234 : le lien "Produit" pointe vers `/produit`.
- Navbar actuelle : "Produit" + "Tarifs" + sélecteur de langue + "Se connecter" + CTA.

## Action unique
Dans `src/pages/Landing.tsx`, remplacer le `<Link to="/produit">` par un élément non-naviguant qui conserve le même rendu visuel (libellé + hover).

Remplacer :
```tsx
<Link to="/produit" className="hover:text-foreground transition-colors">
  {t("nav.product")}
</Link>
```

Par (bouton sans navigation, curseur par défaut, style identique) :
```tsx
<span className="text-muted-foreground hover:text-foreground transition-colors cursor-default">
  {t("nav.product")}
</span>
```

Le libellé "Produit"/"Product" reste. Au survol, le texte passe en `foreground` comme avant. Aucune navigation ne se produit.

## Ce qu'on ne fait pas
- On ne supprime pas `Produit.tsx` ni la route `/produit` dans `App.tsx`.
- On ne supprime pas les clés i18n `productPage` / `nav.product`.
- On ne supprime pas les assets `product-*.png`.
- On ne touche pas au bouton "Tarifs" ni aux autres éléments de la navbar.

## Effet
- Le menu affiche toujours "Produit" — la navbar reste visuellement équilibrée.
- Cliquer sur "Produit" ne fait rien : on reste sur la page courante, aucune navigation vers `/produit`.
- L'URL `/produit` reste accessible si on la tape directement (sécurité : rien de cassé).

## Vérification
- Build OK.
- Test navigateur : la navbar affiche "Produit" ; le clic ne change pas l'URL ; `/produit` répond toujours si on y va directement.

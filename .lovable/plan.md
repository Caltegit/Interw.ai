## Objectif
Quand un picto (LinkedIn ou CV) est en état "non renseigné", un clic doit ouvrir le dialog `CandidateLinksDialog` pour saisir l'information correspondante.

## Fichier modifié
`src/components/session/DecisionBanner.tsx` (composant interne `CandidateLinkIcons`, lignes 400-462).

## Changements

1. **Ajouter une prop `onAddLinks: () => void`** à `CandidateLinkIcons`, transmise depuis le parent (qui contrôle déjà l'ouverture du `CandidateLinksDialog` via le bouton "Ajouter LinkedIn / CV", ligne 227).

2. **Picto LinkedIn inactif** (lignes 427-433) : remplacer le `<span>` par un `<button type="button" onClick={onAddLinks}>` avec les mêmes styles + `hover:bg-muted hover:text-foreground/70` pour signaler l'interactivité. Tooltip : "Ajouter le profil LinkedIn".

3. **Picto CV inactif** (lignes 449-455) : idem, `<button onClick={onAddLinks}>`. Tooltip : "Ajouter le CV".

4. **Propagation** : passer `onAddLinks` aux deux appels de `CandidateLinkIcons` (lignes 256 et 275) en réutilisant la fonction qui ouvre déjà le dialog depuis le bouton "Ajouter LinkedIn / CV".

## Hors périmètre
- Aucun changement sur les pictos actifs (lien LinkedIn externe / ouverture CV).
- Aucun changement de logique métier ou de schéma.
- Pas de pré-sélection d'onglet dans le dialog (le dialog gère déjà les deux champs sur le même écran).

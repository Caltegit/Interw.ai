## Objectif
Améliorer la visibilité de la barre d'onglets du rapport de session (Résumé / Fit Poste / Orale / Attitude / Big Five / Texte) en l'agrandissant de ~50% et en rendant les pastilles de notes plus grosses.

## Changements (un seul fichier)

**`src/components/session/SessionReportView.tsx`** (lignes 275-306)

1. Sur `<TabsList>` : ajouter `h-14` (au lieu du `h-10` par défaut de shadcn → +40%, visuellement ~50% plus haut une fois le padding interne pris en compte).
2. Sur chaque `<TabsTrigger>` : ajouter `h-12 text-sm font-medium` pour augmenter la hauteur du bouton actif et la lisibilité du libellé.
3. Sur les 4 badges de score (`FitScoreBadge`, `ParaverbalBadge`, `NonverbalBadge`, `BigFiveBadge`) : passer `size={25}` → `size={32}` pour des pastilles plus visibles, avec un chiffre plus gros.
4. Vérifier que les icônes Lucide `h-4 w-4` restent cohérentes (sinon passer à `h-5 w-5` si la balance icône/texte le demande après aperçu).

Aucun autre fichier touché. Pas de logique métier modifiée.

## Vérification
Recharger `/projects/.../sessions/...` et confirmer visuellement que la barre est nettement plus haute et que les pastilles de note sont plus lisibles, sans casser le layout responsive (`grid-cols-6`).

## Diagnostic

Sur le projet en question, il y a 60 sessions prêtes (avec rapport) :
- 47 « Non » (rejected)
- 9 « Retenu »
- 4 « À discuter »
- 0 « À traiter »

La page Projet affiche 4 chips de filtre au-dessus de la liste (« À traiter / Retenu / À discuter / Non »). Ces chips agissent comme un filtre de visibilité stocké dans `localStorage` (clé `projectDecisionVisibility:<id>`).

Deux problèmes se combinent :

1. **Chip « Non » désactivé par défaut** : la valeur initiale ne contient que `none`, `shortlisted`, `second_opinion`. Donc les 47 candidats rejetés sont invisibles dès la première visite — l'utilisateur a l'impression que la liste est vide ou très courte.
2. **Si tous les chips sont désactivés → liste totalement vide**, sans aucun message ni moyen évident de comprendre que c'est un filtre de chips qui masque tout. Le `localStorage` peut aussi se retrouver à `[]` après manipulation, ce qui masque définitivement toutes les sessions tant qu'on n'a pas re-cliqué sur un chip.

## Correction proposée

Dans `src/pages/ProjectDetail.tsx` :

1. Inclure `rejected` dans l'ensemble par défaut → tous les statuts visibles à la première visite.
2. Si `visibleDecisions` est vide (aucun chip actif), considérer cela comme « tout afficher » plutôt que « tout masquer ». Cela évite l'état piège où la liste est vide sans raison apparente.
3. Garder l'affichage visuel actuel des chips (actifs / inactifs) inchangé.

Aucun changement de schéma, de RLS, ni de logique métier — uniquement le filtre de présentation côté front.

## Vérification

- Recharger la page projet : les 60 sessions prêtes apparaissent.
- Désactiver tous les chips : la liste reste visible (comportement « aucun filtre »).
- Activer un seul chip : seul le sous-ensemble correspondant s'affiche.

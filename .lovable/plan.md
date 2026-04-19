

## Plan

L'utilisateur veut dupliquer les boutons "Précédent" / "Suivant" pour qu'ils apparaissent **aussi au-dessus** du conteneur (le "carré" = la Card de l'étape du wizard), en plus de leur position actuelle en bas.

### Fichiers à explorer puis modifier

`src/pages/ProjectNew.tsx` (et probablement `ProjectEdit.tsx` si même structure de wizard) — repérer le bloc actuel des boutons de navigation et ajouter une copie identique au-dessus de la Card.

### Implémentation

1. Extraire le JSX des boutons "Précédent" / "Suivant" dans une variable locale `navButtons` (ou un petit composant inline) pour éviter la duplication.
2. Rendre `{navButtons}` à deux endroits :
   - Juste **au-dessus** de la Card de l'étape (nouveau).
   - **En bas**, position actuelle conservée.
3. Garder exactement le même comportement (disabled sur étape 1 pour Précédent, label "Créer" sur dernière étape pour Suivant, etc.).
4. Petit espacement vertical (`mb-4`) au-dessus pour aérer.

### Pas de changement

- Aucune logique métier modifiée.
- Aucun changement DB / edge function.
- Pas de test E2E à mettre à jour (les sélecteurs des boutons restent valides, juste dupliqués — on s'assurera d'utiliser `.first()` si besoin lors du test).


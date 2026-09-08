# Corrections étape 2 "Critères"

## Objectif
Améliorer l'étape 2 du wizard de création/modification d'un poste : rendre le bouton "Ajouter aux ressources" fonctionnel et lisible, et clarifier l'affichage de la pondération.

## Changements prévus

### 1. Bouton "Ajouter aux ressources"
- Vérifier que le flag `save_to_library` est bien pris en compte dans `ProjectNew.tsx` et `ProjectEdit.tsx` au moment de la sauvegarde du poste.
- Si le critère est marqué mais n'a pas de libellé (filtre `validCriteria` sur `label.trim()`), afficher un toast explicite invitant à nommer le critère avant de le sauvegarder en ressources.
- Ajouter un toast de confirmation quand un ou plusieurs critères sont effectivement ajoutés à la bibliothèque.
- Remplacer le simple `title` natif par un tooltip accessible affichant "Ajouter aux ressources" au survol.

### 2. Barre de pondération
- Raccourcir la barre `Slider` dans `StepCriteria.tsx` pour laisser plus d'espace au label et à la valeur.
- Afficher `X % de pondération` à la place du simple `X %` à côté de la barre.
- Conserver le cadenas et le rééquilibrage automatique existants.

### 3. Validation
- Lancer `bun run build` pour s'assurer que les modifications compilent.
- Vérifier visuellement dans l'aperçu que le slider est plus court, le libellé est clair, le tooltip s'affiche et que le bouton "Ajouter aux ressources" donne un feedback après sauvegarde.

# Édition inline des critères — étape 2 création projet

## Objectif

Supprimer la popup `CriterionFormDialog` pour l'édition. Tout se passe directement dans la carte du critère sur la page : titre + slider de pondération sur une ligne, description dessous en édition directe.

## Nouvelle structure de carte (fichier `src/components/project/StepCriteria.tsx`)

Chaque critère devient une carte auto-contenue :

```text
┌───────────────────────────────────────────────────────────┐
│ 🔒  [Libellé du critère...............]  ▬▬▬●▬▬  25%  🗑  │
│     [Description (guide pour l'IA)........................│
│      .....................................................│
│      ...................................................] │
└───────────────────────────────────────────────────────────┘
```

- **Ligne 1** : bouton lock (inchangé) · `Input` libellé (flex-1) · `Slider` (w-32 à w-40) · badge `xx%` · bouton supprimer.
- **Ligne 2** : `Textarea` description (2 lignes, auto-grow léger), placeholder « Guide pour l'IA : ce qu'il faut évaluer... ».
- Le bouton crayon disparaît (édition = directe).
- L'ajout via « + Ajouter » insère une carte vide, focus automatique sur le libellé.

## Éléments retirés

- Ouverture du `CriterionFormDialog` sur clic carte / crayon → supprimé.
- `openEdit`, `editingIndex`, `initialForm`, `formOpen`, `handleFormSubmit` → supprimés.
- Le rendu `<CriterionFormDialog ... />` en bas → supprimé.
- Le composant `CriterionFormDialog` **reste** dans le repo car utilisé ailleurs (à vérifier — `CriteriaLibraryManager.tsx` et `CriterionFormDialog.tsx` sont utilisés dans la page Ressources). On ne le supprime pas.

## Éléments conservés

- Système de lock, rebalance, égalisation, import depuis Ressources (`CriteriaLibraryDialog`).
- Le champ « Ajouter à mes ressources » : déplacé en petit lien texte discret sous la description (« ✚ Ajouter à mes ressources ») avec une checkbox, uniquement pour les critères non issus de la bibliothèque. Alternative : bouton icône `BookmarkPlus` toggle dans la ligne 1 à droite. **Choix retenu** : icône toggle dans la ligne 1 (plus compact, cohérent avec les autres boutons icônes).
- Champs `scoring_scale`, `applies_to`, `anchors`, `category` : conservés dans le state avec leurs valeurs par défaut (`0-5`, `all_questions`, `{}`, `""`) — non éditables ici puisque non utilisés dans le flux actuel de création. Les critères importés depuis Ressources gardent leurs valeurs.

## Fichier modifié

- `src/components/project/StepCriteria.tsx` uniquement.

Aucun impact sur : Ressources > Critères, modèles d'entretien, schéma DB.

## Preview

Une fois implémenté, je te montre le rendu via un screenshot Playwright de `/projects/new` étape 2 avec 2–3 critères ajoutés.

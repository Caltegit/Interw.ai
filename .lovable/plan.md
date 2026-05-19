# Plan

## Objectif
Corriger l’erreur affichée pendant la création afin que le projet soit bien créé sans référence au champ supprimé `description`.

## Ce que je vais faire
1. Retirer l’envoi de `description` dans le flux de création de projet (`ProjectNew`).
2. Vérifier s’il reste d’autres accès frontend au champ `projects.description` sur le parcours de création/publication.
3. Valider le résultat en testant le parcours concerné pour m’assurer qu’on ne redemande plus cette colonne.

## Détail technique
- La migration précédente a bien corrigé la fonction backend de seed.
- Le bug restant vient du frontend : `src/pages/ProjectNew.tsx` fait encore un `.insert()` sur `projects` avec `description: ""`.
- La table `projects` n’a plus cette colonne, donc PostgREST renvoie : `Could not find the 'description' column of 'projects' in the schema cache`.
- La correction devrait être limitée au code de création de projet, sans changement de schéma.

## Résultat attendu
- Le bouton « Créer le projet » fonctionne à nouveau.
- Aucun toast d’erreur lié à `projects.description`.
- Le projet est créé puis redirige vers sa fiche comme prévu.
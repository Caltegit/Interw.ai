# Réduire l’espace entre nom et date sur les cartes candidat

## Objectif
Dans la vue cartes d’un poste, rapprocher le nom/prénom du candidat de la date de réponse affichée juste en dessous.

## Résultat attendu
- L’écart vertical entre le lien `candidate_name` et le `span` de date est plus petit que les autres espacements de la carte.
- Le reste de la mise en page (score, badge, décision, vidéo, note) reste inchangé.

## Périmètre
- `src/components/project/SessionCard.tsx` uniquement.

## Étapes
1. Englober le nom et la date dans un conteneur flex vertical avec un `gap` réduit (ex. `gap-0.5`).
2. Conserver l’alignement centré et le style texte existants.
3. Vérifier TypeScript (`bunx tsc --noEmit`) pour s’assurer qu’aucune erreur n’est introduite.

## Non inclus
- Aucune modification de la vue liste.
- Aucun changement de données ou d’API.

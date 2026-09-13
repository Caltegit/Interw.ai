# Remplacer le badge « RDV » sur les dernières sessions candidats

## Constat

- `src/components/SessionStatusBadge.tsx` : le statut `in_progress` affiche « RDV » (libellé historique, présent de longue date).
- Une session terminée côté candidat mais dont le rapport est encore en génération reste `in_progress` → elle affiche « RDV » alors que le candidat a fini.
- `src/pages/Dashboard.tsx` : le tableau « Dernières sessions candidats » affiche ce badge tel quel.
- Le même badge est utilisé dans `ProjectDetail.tsx` et `SessionsQueueTab.tsx` (admin).

## Changements

### 1. Nouveau libellé pour `in_progress`
- `src/components/SessionStatusBadge.tsx` : remplacer le libellé « RDV » par « En cours ».
- Bénéfice : toutes les vues qui utilisent ce badge (tableau de bord, détail poste, file admin) sont corrigées d'un coup, sans duplication.

### 2. Cas « terminé mais pas encore analysé »
- Dans `src/pages/Dashboard.tsx` uniquement : pour une session `in_progress` dont le candidat a terminé (détecté via l'absence de rapport associé sur une session proche de la fin n'étant pas fiable côté client), conserver « En cours ».
- Plus précis : ajouter une variante de statut d'affichage « Analyse en cours » quand la session est `completed` côté parcours mais sans rapport encore disponible — si et seulement si la donnée le permet sans changer le backend. Sinon, « En cours » suffit et aucune logique supplémentaire n'est ajoutée (simplicité).

### 3. Aucun changement de données
- Aucune migration, aucune modification des statuts en base, aucun impact sur les autres organisations.

## Fichiers touchés

- `src/components/SessionStatusBadge.tsx` (libellé)
- `src/pages/Dashboard.tsx` (uniquement si l'option « Analyse en cours » est faisable proprement)

## Vérification

- Typecheck TypeScript.
- Capture de la vue tableau de bord confirmant « En cours » à la place de « RDV ».

## Décision demandée

Afficher simplement « En cours » partout (recommandé, minimal), ou distinguer « Analyse en cours » pour les sessions terminées en attente de rapport ?

## Objectif
Afficher au survol de la sélection d'un candidat (Retenu / À discuter / Non / À traiter) le nom de la personne qui a effectué la dernière action, sous la forme « Par Prénom Nom » (avec la date).

## Bonne nouvelle
La table `sessions` contient déjà `recruiter_decision_by` (uuid) et `recruiter_decision_at` (timestamp), et ces champs sont déjà mis à jour côté front lors d'un changement de décision (`useSessionDetail.ts`, `ProjectDetail.tsx`). Aucune migration n'est nécessaire.

## Changements

### 1. Récupération du nom de l'auteur
- **`src/pages/ProjectDetail.tsx`** : ajouter `recruiter_decision_at, recruiter_decision_by` dans le `select` des sessions, puis charger en une requête les profils correspondants (`profiles` filtré par `user_id IN (...)`) pour construire un map `userId → full_name`. Passer ces infos à `SessionCard`.
- **`src/pages/ProjectCompare.tsx`** : même traitement (select + map profils).
- **`src/hooks/queries/useSessionDetail.ts`** : déjà renvoie `recruiter_decision_by/at`. Ajouter une petite requête (ou jointure) pour récupérer le `full_name` du décideur et l'exposer via le hook.

### 2. Affichage au survol (tooltips)
- **`src/components/project/SessionCard.tsx`** : envelopper le badge/pill de décision actif dans un `Tooltip` (composant déjà disponible) affichant :
  - « Par {Prénom Nom} »
  - « le {date courte FR} » sur une 2e ligne
  - Si `recruiter_decision_by` est null → ne rien afficher (tooltip masqué).
- **`src/components/session/DecisionBanner.tsx`** : entourer le bouton de décision actif (Retenu / À discuter / Non) du même `Tooltip`. Nouveau prop optionnel `decisionByName` + `decisionAt`.
- **`src/pages/SessionDetail.tsx`** & **`src/pages/SharedReport.tsx`** : passer ces nouvelles props au `DecisionBanner`. Sur la page partagée publique, masquer si pas dispo (RLS anon).
- **`src/pages/ProjectCompare.tsx`** : tooltip identique sur la cellule de décision.

### 3. Détails UX
- Format date : `11 mai 2026` (Intl français court).
- Si décision = `none` (À traiter) sans auteur → pas de tooltip.
- Tooltip texte simple, pas de badge supplémentaire visible (zéro pollution visuelle).

## Fichiers modifiés
- `src/pages/ProjectDetail.tsx`
- `src/pages/ProjectCompare.tsx`
- `src/pages/SessionDetail.tsx`
- `src/pages/SharedReport.tsx`
- `src/hooks/queries/useSessionDetail.ts`
- `src/components/project/SessionCard.tsx`
- `src/components/session/DecisionBanner.tsx`

Aucune migration DB, aucune modification de logique métier hormis la lecture des profils.
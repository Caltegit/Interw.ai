## Objectif

Rendre l'analyse vocale (paraverbale) systématique pour tous les projets, masquer l'option dans les paramètres, et l'appliquer aussi à la régénération des rapports existants.

## Changements

### 1. Backend — `generate-report`
Supprimer la condition `if (project?.audio_analysis_enabled)` (ligne 1106). Le déclenchement de `analyze-paraverbal` devient systématique pour toutes les sessions, y compris lors d'une régénération de rapport sur un projet existant.

### 2. Base de données
Migration légère :
- `projects.audio_analysis_enabled` : passer le `DEFAULT` à `true`
- Mettre à jour les projets existants : `UPDATE projects SET audio_analysis_enabled = true`

(La colonne reste pour rétrocompatibilité, mais devient sans effet côté code.)

### 3. UI — Masquer l'option

Dans `src/components/project/ProjectForm.tsx` :
- Retirer le bloc Switch "Analyse vocale du candidat" (autour de la ligne 734)
- Garder le state `audioAnalysisEnabled` initialisé à `true` (forcé), pour ne pas casser le contrat du formulaire

Dans `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` :
- Forcer `audioAnalysisEnabled: true` à la lecture/écriture
- Toujours envoyer `audio_analysis_enabled: true` à l'insert/update

## Effet sur les rapports régénérés

Comme le déclenchement passe désormais par `generate-report` sans condition, **toute régénération** d'un rapport (nouveau ou ancien projet) lance l'analyse paraverbale, à condition que les segments audio soient encore présents dans le stockage (pas purgés par le cron RGPD à 12 mois).

## Hors scope

- Pas de re-analyse rétroactive automatique des rapports déjà générés : il faudra cliquer sur "Régénérer le rapport" pour obtenir l'analyse vocale sur les anciens entretiens.

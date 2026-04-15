

# Passage auto 5s — détection silence + décompte visuel

## Concept

Quand le candidat ne parle pas pendant 5 secondes après qu'une question est posée, un décompte visuel apparaît ("Prochaine question dans X s"). Si le candidat reparle pendant le décompte, celui-ci s'annule. Sinon, passage automatique à la question suivante.

Ce comportement est configurable par projet via un toggle "Passage auto 5s" dans l'étape Publication de la création de projet.

## Modifications

### 1. Migration DB — ajouter la colonne `auto_skip_silence` à `projects`

```sql
ALTER TABLE public.projects ADD COLUMN auto_skip_silence boolean NOT NULL DEFAULT false;
```

### 2. `src/pages/ProjectNew.tsx`

- Ajouter un state `autoSkipSilence` (défaut `false`)
- Ajouter un Switch "Passage auto 5s" dans l'étape 4 (Publication), avec description explicative
- Passer la valeur dans l'insert du projet

### 3. `src/pages/InterviewStart.tsx`

- Lire `project.auto_skip_silence` depuis les données chargées
- Ajouter un state `autoSkipCountdown` (null ou nombre de secondes restantes)
- Après que l'IA finit de parler et que le candidat peut répondre, démarrer un timer de 5s de silence
- Détecter le silence via `liveTranscript` : si pas de changement pendant 5s → lancer le décompte (5, 4, 3, 2, 1)
- Si `liveTranscript` change pendant le décompte → annuler le décompte, reset le timer
- À 0 → appeler `handleSendResponse` automatiquement (ou passer directement à la question suivante si transcript vide)
- Afficher le décompte visuellement dans la colonne candidat (badge animé "Prochaine question dans X s")

### 4. `src/pages/ProjectEdit.tsx`

- Ajouter le même toggle pour la modification de projet existant


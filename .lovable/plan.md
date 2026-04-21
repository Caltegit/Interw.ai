

## Plan — Masquer le réglage « Passage automatique après silence »

Cacher l'option dans le formulaire de création/édition de projet, sans toucher à la logique côté entretien (qui reste désactivée par le `return` actuel).

### Changements

- `src/pages/ProjectNew.tsx` : masquer le bloc UI du champ `auto_skip_silence` (toggle + libellé + description).
- `src/pages/ProjectEdit.tsx` : même masquage si le champ y est exposé.

Le champ reste dans le state et continue d'être envoyé en base avec sa valeur par défaut — aucune migration, aucune perte de données. On pourra le réafficher en une ligne quand la fonctionnalité sera réactivée.

### Hors champ

- Pas de modification de `InterviewStart.tsx` (auto-skip déjà neutralisé).
- Pas de changement de schéma BDD.
- Pas de suppression de code, juste un masquage propre.


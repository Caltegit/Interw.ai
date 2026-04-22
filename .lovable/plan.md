

## Ajustement du projet de démo seedé à la création d'une organisation

### Objectif

Aligner le projet « Candidature spontanée » créé automatiquement à chaque nouvelle organisation sur le libellé exact demandé.

### Changements

Modifier la fonction SQL `seed_demo_project` (via une migration) :

1. **Titre** : `Candidature spontanée` → `Candidature spontanée - TEST -`
2. **Texte d'intro** : remplacer la dernière phrase
   - Avant : « …customiser. À suivre, 5 questions lues par l'IA. »
   - Après : « …modifier. Suivrons 5 questions pour le candidat. »
3. **Garde anti-doublon** : la condition `WHERE title = 'Candidature spontanée'` devient `WHERE title = 'Candidature spontanée - TEST -'` pour rester idempotente sur les nouvelles organisations.

### Ce qui ne change pas

- Les 5 questions (déjà identiques au mot près à ta demande).
- Les 10 critères d'évaluation seedés au niveau organisation.
- Les paramètres voix (Marie, ElevenLabs), durée, langue.
- Les organisations **déjà existantes** : leur projet actuel n'est pas renommé.

### Fichier touché

- Une nouvelle migration SQL avec un `CREATE OR REPLACE FUNCTION public.seed_demo_project(...)` intégrant les trois modifications.

### À confirmer après approbation

Souhaites-tu aussi renommer rétroactivement les projets « Candidature spontanée » existants des organisations déjà créées en « Candidature spontanée - TEST - » ? Par défaut, la migration ne touche que les nouvelles organisations.


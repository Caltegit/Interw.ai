## Objectif

Retirer l'analyse d'expressivité faciale pour se conformer à l'AI Act européen (art. 5(1)(f) — interdiction de la reconnaissance d'émotions sur le lieu de travail). Regard, posture, gestes sont conservés (comportemental, autorisé).

## Changements

### `supabase/functions/analyze-nonverbal/index.ts`
- Retirer `facial_expressivity` du `TOOL_SCHEMA` (propriété + `required`).
- Retirer la mention `facial_expressivity` du `systemPrompt` (passer de 4 à 3 dimensions, retirer la ligne "visage vivant et congruent", retirer "visage" de la parenthèse d'intro).
- Ajouter une consigne explicite : "N'infère jamais un état émotionnel, une humeur ou un ressenti. Reste sur des observations comportementales factuelles."

### `src/components/session/NonverbalProfileCard.tsx`
- Retirer l'entrée `facial_expressivity` du tableau `DIMENSIONS`.
- Retirer le champ `facial_expressivity` de l'interface `NonverbalProfile` (facultatif — laisser optionnel pour rétrocompat des anciens rapports).

### `src/components/session/NonverbalBadge.tsx`
- Retirer `facial_expressivity` de `KEYS` → la moyenne est désormais calculée sur 3 dimensions (regard, posture, gestes).

### Rétrocompatibilité
- Pas de backfill. Les anciens rapports gardent `facial_expressivity` en base mais il ne sera plus affiché ni compté dans la moyenne.

## Hors périmètre
- Onglet Attitude conservé.
- Pas de modification de l'analyse paraverbale (à réévaluer séparément).
- Pas d'audit complet AI Act (classification haut risque, documentation) — chantier séparé nécessitant une validation juridique.

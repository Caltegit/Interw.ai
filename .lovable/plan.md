## Ajustements demandés

1. **Case "non informative" (pas de citation ni vidéo)** : la garder visuellement en fond blanc/discret et non cliquable (pas de popover), mais **afficher la note** à l'intérieur pour montrer qu'elle compte dans les moyennes.
2. **Ré-inclure ces cases dans les moyennes** (ligne, colonne, Fit global). C'est-à-dire annuler l'exclusion posée au tour précédent, à la fois dans `FitMatrixCard.tsx` et dans `generate-fit-matrix/index.ts`.
3. **Prompt IA** : dans `supabase/functions/generate-fit-matrix/index.ts` (règle 2 du prompt), remplacer *"score neutre 40-50"* par **"score neutre 50"** pour que l'IA ait une valeur par défaut unique et claire quand elle n'a rien à noter.

## Fichiers modifiés

- `src/components/session/FitMatrixCard.tsx`
  - `columnAverages` et `rowAverages` : repasser à l'inclusion de toutes les cases avec un `score` numérique (peu importe la présence de `quote`/`message_id`).
  - Rendu de la case non informative : conserver le style blanc (`bg-background`, bordure `border-dashed border-border/60`), non cliquable, mais afficher `{score}` en gris clair centré. Ajouter un `title="Note par défaut : critère non couvert par la question"` pour l'info au survol.

- `supabase/functions/generate-fit-matrix/index.ts`
  - Prompt ligne 139 : `mets un score neutre 50`.
  - Retirer le filtre `isInformative` du calcul des moyennes et du Fit global — retour à la formule "toutes les cases avec `score` numérique comptent".

## Hors scope
- Aucune modification du back `generate-report`.
- Pas de migration rétroactive : les rapports existants restent tels quels jusqu'à un nouveau clic sur "Voir les détails".
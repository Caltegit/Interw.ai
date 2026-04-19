

## Analyse

Le lien "La question ne se lance pas ? Continuer →" est un fallback affiché pendant que l'IA prépare/joue la question. S'il crée un bug (probablement : skip prématuré qui désynchronise l'état de la conversation, ou double-déclenchement de la question suivante), deux options :

**Option 1 — Le retirer purement et simplement**
Plus simple, plus safe. Si la question ne se lance vraiment pas, le candidat recharge la page. Risque : un candidat bloqué sans recours immédiat.

**Option 2 — Le garder mais corriger le bug**
Nécessite d'identifier le bug exact (j'aurais besoin d'investiguer `InterviewStart.tsx` autour du handler de ce lien).

## Recommandation : Option 1 (retirer)

Vu que :
- L'IA a déjà un timeout/auto-retry interne dans la plupart des cas
- Le lien est un "panic button" qui contourne le flow normal → source typique de bugs de désynchronisation
- En cas de vrai blocage, le rechargement de page reprend la session là où elle en était

→ Je propose de **retirer le lien** dans `InterviewStart.tsx`.

## Plan

1. Localiser le lien "La question ne se lance pas ? Continuer →" dans `src/pages/InterviewStart.tsx`.
2. Supprimer le `<button>`/`<a>` correspondant ainsi que son handler s'il n'est utilisé que là.
3. Garder l'indicateur "L'IA pose la question…" qui reste utile.

### Test
Refaire un entretien complet → vérifier que l'indicateur "L'IA pose la question…" s'affiche toujours, sans le lien en dessous, et que les questions s'enchaînent normalement.


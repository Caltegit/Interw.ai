## Constat

Dans les onglets **Orale** et **Attitude** du rapport :
- L'IA renvoie aujourd'hui uniquement `evidence_message_id` (la question concernée), pas de timestamp ni de citation.
- Le composant `EvidenceLink` ne s'affiche que s'il existe une citation, et même quand il s'affiche, il passe `startSeconds={undefined}` → le bouton ramène au début de la réponse, pas au moment précis.
- Pour les "micro-tensions" (Attitude), même problème : pas de timestamp dans le schéma.

Conséquence : il n'y a pas de bouton "▶ Q3 · 0:42" qui ouvre la vidéo pile sur le moment cité, contrairement à ce qui existe déjà dans Résumé / Fit / Big Five.

## Objectif

Ajouter, pour chaque dimension orale (6) et corporelle (4) et chaque micro-tension, un bouton de saut vers le moment précis dans la vidéo — même format visuel que les autres onglets.

## Étapes

1. **Edge function `analyze-paraverbal`**
   - Ajouter au schéma de chaque dimension : `evidence_start_seconds` (number, secondes depuis le début de la réponse) et `evidence_quote` (string court, ≤ 20 mots).
   - Mettre à jour le prompt système pour demander explicitement ces deux champs avec le moment audio le plus représentatif.

2. **Edge function `analyze-nonverbal`**
   - Idem pour chaque dimension corporelle : `evidence_start_seconds` + `evidence_quote` (description visuelle courte du moment observé).
   - Ajouter `start_seconds` (requis) au schéma de `micro_tensions[]`.
   - Mettre à jour le prompt pour demander les timestamps.

3. **UI — `ParaverbalProfileCard.tsx`**
   - Remplacer `startSeconds={undefined}` par `dim.evidence_start_seconds`.
   - Garantir l'affichage du bouton même sans citation (rendre `EvidenceLink` ou `MomentJumpButton` dès qu'un `evidence_message_id` résoluble existe).

4. **UI — `NonverbalProfileCard.tsx`**
   - Mêmes changements pour les 4 dimensions.
   - Pour `micro_tensions`, passer `t.start_seconds` à `EvidenceLink`.

5. **Backfill — `backfill-report-timestamps`**
   - Le code actuel cible `paraverbal_analysis.dimensions` (tableau) qui n'existe pas : la vraie forme est `paraverbal_analysis.profile.{fluency, hesitation, …}`. Adapter le parcours.
   - Ajouter le traitement de `nonverbal_analysis.profile.{eye_contact, …}` et `nonverbal_analysis.micro_tensions[]`.
   - Cela permet aux anciens rapports de récupérer des timestamps là où c'est possible (alignement par transcript).

6. **Rapports existants**
   - Les analyses déjà calculées ne contiennent pas les timestamps. Le bouton "Relancer l'analyse" existant dans chaque onglet permet déjà de regénérer. Aucun changement supplémentaire requis.

## Détails techniques

- `EvidenceLink` accepte déjà `startSeconds` et l'affiche au format `Q3 · 0:42` → aucun changement de composant.
- Le hook `goToMessage` dans `SessionReportView` passe déjà `startSeconds` au lecteur vidéo via `videoNavRef.current.playMessage(messageId, startSeconds)`.
- `resolveVideoMessageId` (paraverbal sur segment audio seul) continue à mapper vers le clip vidéo de la même question — le `startSeconds` reste valide car les deux segments couvrent la même réponse.

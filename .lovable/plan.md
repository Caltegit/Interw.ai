## Objectif
Uniformiser l'UI des liens « moment » dans les cartes **Big Five**, **Communication orale** et **Attitude/langage corporel**, pour matcher exactement le rapport IA : petit bouton play + repère **`Qn · m:ss`**.

## Constat actuel
- `PersonalityRadar` : icône play seule (sans repère Qn · m:ss).
- `ParaverbalProfileCard` : lien texte « Écouter l'extrait » (pas de play, pas de repère).
- `NonverbalProfileCard` : lien texte « Voir le moment » dans les dimensions ET dans les points d'attention (pas de play, pas de repère).

## Plan

1. **Créer un petit composant réutilisable** `src/components/session/MomentJumpButton.tsx`
   - rend : `[▶] Q{n} · {m:ss}` (même style que `EvidenceLink` : `text-primary`, tabular-nums)
   - props : `messageId`, `startSeconds?`, `questionNumber?`, `onGoToMessage`
   - tooltip : « Moment dans la réponse à cette question »
   - format secondes : `m:ss` (réutilise la même logique que `EvidenceLink`)

2. **`PersonalityRadar.tsx`**
   - ajouter prop `questionNumberByMessageId?: Record<string, number>`
   - remplacer le `<Button>` play actuel par `<MomentJumpButton>`

3. **`ParaverbalProfileCard.tsx`**
   - étendre l'interface `ParaverbalDim` : ajouter `evidence_start_seconds?: number` et `evidence_quote?: string` (déjà présents en base via `backfill-report-timestamps`)
   - ajouter prop `questionNumberByMessageId?: Record<string, number>`
   - remplacer le lien « Écouter l'extrait » par `<MomentJumpButton>`

4. **`NonverbalProfileCard.tsx`**
   - étendre `NonverbalDim` : `evidence_start_seconds?: number`
   - étendre `MicroTension` : `start_seconds?: number`
   - ajouter prop `questionNumberByMessageId?: Record<string, number>`
   - remplacer les liens « Voir le moment » (dimensions ET points d'attention) par `<MomentJumpButton>`

5. **Câblage**
   - `SessionDetail.tsx` et `SharedReport.tsx` : passer `questionNumberByMessageId` (déjà calculé dans `SessionDetail`, à reproduire dans `SharedReport`) aux 3 cartes.

## Hors scope
- Aucun changement backend.
- Le calcul des `evidence_start_seconds` est déjà fait par `generate-report` et `backfill-report-timestamps` : on ne touche pas à la logique.
- Aucun changement du lecteur vidéo lui-même.

## Vérification
- Ouvrir une session avec données présentes dans chacune des 3 cartes.
- Vérifier visuellement que chaque ligne affiche bien `[▶] Qn · m:ss` au même style que le rapport IA.
- Cliquer un repère → le lecteur saute au bon clip et au bon moment.
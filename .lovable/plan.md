## Objectif

Sur le rapport de session :
1. Remplacer la carte « En chiffres » (sidebar gauche) par la **vidéo complète** de l'entretien.
2. Renommer l'onglet « Best-of » en « Vidéo » et y afficher la **vidéo complète** au lieu du best-of.
3. Nettoyer les composants devenus inutiles.

## Contexte technique

- `session.video_recording_url` est déjà chargée par `useSessionDetail` (vidéo complète de l'entretien).
- La carte « En chiffres » = `<SessionStatsCard>` dans `src/pages/SessionDetail.tsx` (sidebar gauche).
- L'onglet `best-of` utilise actuellement `<HighlightReelPlayer>`.

## Modifications

### `src/pages/SessionDetail.tsx`

**Sidebar gauche** — remplacer `<SessionStatsCard …/>` par une carte « Vidéo de l'entretien » :
- Si `session.video_recording_url` : lecteur `<video controls preload="metadata">` au format `aspect-video`, fond noir.
- Sinon : message « Vidéo complète indisponible. »
- La carte « Notes recruteur » descend naturellement en dessous.

**Onglet Best-of → Vidéo** :
- Renommer le label visible en « Vidéo » (icône `Video` au lieu de `Trophy`).
- Remplacer `<HighlightReelPlayer …/>` par un simple lecteur vidéo sur `session.video_recording_url`, avec fallback texte si absent.

**Nettoyage** :
- Retirer les imports `SessionStatsCard`, `HighlightReelPlayer`, `HighlightClip`, `Trophy`.
- Supprimer la logique `highlightClips` / `rawHighlightClips`.

### Fichiers supprimés (après vérification qu'ils ne sont plus référencés ailleurs)

- `src/components/session/HighlightReelPlayer.tsx`
- `src/components/session/SessionStatsCard.tsx`

## Vérification

- Session avec vidéo : lecteur visible dans la sidebar **et** dans l'onglet « Vidéo ».
- Session sans `video_recording_url` : message clair, pas d'erreur.
- `rg "SessionStatsCard|HighlightReelPlayer"` ne retourne plus rien.
# Plan — Q15 / sécurisation réparation vidéo

## État
Correctif déployé. `recover-session-video` est désormais atomique :
- aucun fichier final n'est supprimé avant d'avoir prouvé qu'une
  reconstruction saine est possible,
- l'écrasement se fait par `upsert` après upload réussi,
- l'extension fantôme n'est nettoyée qu'en cas de succès complet,
- en cas d'échec la base reste cohérente et un message clair remonte
  au client (au lieu d'un faux succès qui cassait la vidéo).

Le lecteur distingue désormais 404 réel vs vidéo présente mais non
décodable (HEAD sur l'URL en cas de code 4).

## Fichiers modifiés
- `supabase/functions/recover-session-video/index.ts`
- `src/components/session/SessionVideoNavigator.tsx`

## Validation effectuée
- Session `5b8f0f92…` Q15 reconstruite depuis 25 chunks
  (`mode: rebuild`, fichier servi en 200, VP9/Opus OK).
- Cas impossible (`question_index=99`) → 500 propre, `q14.webm` intact.

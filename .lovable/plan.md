## Problème

Dans l'onglet **Vidéo complète** du rapport, seul le 1er segment vidéo s'affiche. C'est normal : `sessions.video_recording_url` n'est rempli qu'avec le **premier** segment candidat (cf. `InterviewStart.tsx` ligne 1728 : `if (!sessRow.video_recording_url)`). Il n'existe pas de fichier vidéo unique fusionné — chaque réponse est stockée séparément dans `session_messages.video_segment_url`.

## Solution

Reconstituer la "vidéo complète" en lisant les segments candidat **en séquence**, avec un menu de chapitres cliquables (une question = un chapitre).

## Modifications

**`src/pages/SessionDetail.tsx`** — onglet `full-video` (lignes 382-399) :

1. Créer un nouveau composant local `FullVideoPlayer` qui reçoit `questionItems` (déjà calculé, contient `{ video, questionText, index }` pour chaque réponse principale).
2. Comportement :
   - Un seul `<video>` en haut (aspect-video, contrôles natifs).
   - State `currentIndex` ; `src = questionItems[currentIndex].video.video_segment_url`.
   - Sur `onEnded` → passer automatiquement au segment suivant (autoplay du suivant).
   - Sous la vidéo : liste numérotée des questions cliquables ("Q1 · texte de la question"), avec mise en évidence de la question en cours (background `bg-muted`, bordure gauche primary).
   - Clic sur une question → change `currentIndex` + force `play()`.
3. Fallback : si `questionItems` est vide → message "Vidéo complète indisponible".
4. Garder l'ancien fallback `session.video_recording_url` uniquement si aucun segment n'existe (peu probable mais sûr).

## Hors scope

- Pas de fusion serveur des segments (coûteuse, nécessiterait ffmpeg edge function — à proposer plus tard si besoin d'un vrai fichier téléchargeable unique).
- Pas de changement DB.

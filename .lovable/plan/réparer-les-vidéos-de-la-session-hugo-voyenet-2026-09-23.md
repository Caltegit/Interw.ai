# Réparer les vidéos de la session Hugo Voyenet

## Session concernée

- **Session** : `8ac84e73-94c2-4c4b-a4fc-bb89ef7c599e`
- **Candidat** : Hugo Voyenet
- **Poste** : Première étape Castalie
- **État** : `completed`, `end_reason = all_questions_done`
- **Réponses** : 6 messages candidat avec médias (`q0` à `q5`)
- **Fichiers** : `q0.webm` à `q5.webm` + `q0.audio.webm` à `q5.audio.webm` + `thumbnail.jpg`

## Cause probable de l'écran noir

Les fichiers sont des **WebM VP9/Opus** générés par le navigateur du candidat. Safari et certains Chrome refusent de décoder ces flux quand la durée n'est pas inscrite ou que le conteneur est incomplet. Le navigateur tourne alors en boucle ou affiche un fond noir.

## Plan de réparation

1. **Télécharger** les 6 paires (`qN.webm` + `qN.audio.webm`) dans un dossier temporaire.
2. **Convertir** chaque vidéo en **MP4 H.264/AAC** (`libx264`, `preset veryfast`, `crf 24`, `yuv420p`, `aac 128k`, `+faststart`).
3. **Vérifier** fichier par fichier :
   - image présente au début / milieu / fin ;
   - piste audio présente ;
   - durée identique à l'originale (écart ≤ 0,25 s pour ne pas casser les renvois horodatés).
4. **Sauvegarder les originaux** dans `media/interviews/8ac84e73-…/originals/` avant remplacement.
5. **Uploader** les 6 nouveaux `qN.mp4` dans le stockage privé.
6. **Mettre à jour** `session_messages.video_segment_url` (et `audio_segment_url` si nécessaire) pour pointer vers les `.mp4`.
7. **Contrôler** que la fiche recruteur charge les 6 vidéos sans écran noir et que le lecteur avance correctement.

## Impact

- **Risque** : faible et isolé. Seules les vidéos de cette session sont converties ; la base n'est modifiée que pour les 6 lignes de cette session.
- **Recruteur** : la fiche redevient lisible.
- **Candidat** : aucun impact (l'entretien est déjà terminé).
- **Données** : aucune suppression ; les originaux sont conservés dans `originals/`.
- **Scoring / rapport** : inchangé ; les transcriptions et notes existantes ne sont pas relancées.

## Test E2E après exécution

- **Recruteur** : ouvrir la fiche, lire les 6 vidéos, vérifier que le son est actif et que le déplacement dans la timeline fonctionne.

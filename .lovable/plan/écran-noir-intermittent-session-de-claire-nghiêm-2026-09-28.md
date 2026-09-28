# Écran noir intermittent — session de Claire Nghiêm

## Ce qui a été vérifié
- Entretien passé ce matin (09:52–09:59), poste Castalie. Trois réponses filmées : q0 (9 Mo), q1 (5 Mo), q2 (0,7 Mo). Les fichiers sont bien présents et complets.
- Les trois sont des WebM enregistrés par le navigateur, **sans durée inscrite** (analyse : « durée inconnue »), avec des défauts de paquets audio en tête de fichier.
- Seules q0 et q1 sont rattachées à une réponse dans la fiche ; q2 existe mais n'est reliée à aucune réponse (non affichée).

## Pourquoi « parfois ça marche, parfois écran noir »
Sans durée ni index, le navigateur doit deviner la structure du fichier en le lisant. Selon le moment (fichier déjà en mémoire ou non, ordre des chargements quand on change de question, nouveau lien sécurisé), il réussit à afficher la première image… ou reste bloqué sur noir. Ce n'est pas la fiche qui est en cause : c'est le format du fichier. C'est le même problème que les autres sessions déjà réparées (ex. Hugo Voyenet).

## Correction proposée
1. **Réparer cette session** : convertir q0, q1, q2 en MP4 standard (durée inscrite, lecture fiable partout, Safari compris), garder les originaux de côté, rebrancher les réponses sur les MP4.
2. **Vérifier q2** : si c'est une vraie réponse (environ 13 s), la rattacher à la bonne question pour qu'elle apparaisse dans la fiche.
3. **Éviter que ça revienne pour les nouveaux entretiens** : à la fin de chaque entretien, convertir automatiquement les réponses en MP4 avant de générer le rapport (les anciennes vidéos ne sont pas touchées, conformément à votre refus de la réparation en masse).

## Impact
- Étapes 1–2 : uniquement la session de Claire ; transcription, note et rapport inchangés.
- Étape 3 : les nouveaux entretiens se lisent de façon fiable avec temps total et déplacement ; léger délai (quelques dizaines de secondes) avant disponibilité de la vidéo. Parcours candidat inchangé.
- Après approbation : test à l'écran de la fiche de Claire, puis E2E candidat puis recruteur.

## Détails techniques
- Conversion ffmpeg VP8/Opus → H.264/AAC `+faststart`, originaux dans `originals/`, mise à jour de `session_messages.video_segment_url`.
- Étape 3 : conversion côté serveur déclenchée à la complétion de session (file existante `report_jobs`), bascule de l'URL seulement après réussite ; en cas d'échec, on garde le WebM.

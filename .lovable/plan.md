# Test d'import VideoAsk → Interw (Tango, poste « Vidéo de présentation »)

## Réponse à ta question : quel format exporter ?

**XLSX file.** C'est le seul format qui contient à la fois les coordonnées structurées et les liens média.

- **CSV file** — mêmes données, mais fragile : les réponses libres contiennent des virgules et des retours à la ligne qui cassent les colonnes.
- **XLSX file** — même contenu, robuste sur les accents et les cellules multilignes. À privilégier.
- **Media files** / **All data** — archives ZIP de vidéos, sans coordonnées structurées. Utiles en secours si les liens du XLSX ne se téléchargent plus.

### Ce que dit la documentation VideoAsk sur les liens média

Les exports CSV et XLSX incluent bien des liens média ([6](https://www.videoask.com/help/tracking/360049684632-export-responses-to-a-csv-or-xlsx-file)), et VideoAsk permet de télécharger les fichiers `.mp4` d'origine ([4](https://www.videoask.com/help/video-audio/360049780191-download-your-videos)).

Point d'attention confirmé : ces liens **expirent**. Des utilisateurs rapportent des réponses `403 Forbidden` sur des URL média récupérées quelques temps plus tôt ([5](https://community.typeform.com/integrate-your-videoask-58/getting-403-trying-to-load-videos-after-some-time-15697)). Il faut donc télécharger les vidéos **rapidement après l'export**, et prévoir l'archive ZIP **All data** comme repli si les liens ne répondent plus.

L'API VideoAsk existe ([3](https://developers.videoask.com/)) mais elle est orientée création de formulaires et récupération de réponses via webhooks, pas rejeu d'un historique passé. Pour ce test, l'export de fichier reste la bonne voie.

## Périmètre du test

Strictement limité :
- organisation **Tango** uniquement ;
- poste **« Vidéo de présentation »** (`eb7db435-1f2f-4ccf-a2ff-f49d68f851db`, 5 questions, 3 critères 35/35/30) ;
- **10 derniers candidats** du XLSX ayant un lien média valide ;
- **aucun e-mail envoyé**, à aucun moment, à aucun candidat.

Ce poste ne contient aujourd'hui aucune session : le test partira d'une base vide, donc sans risque pour des données existantes.

## Étapes

### 1. Tu exportes et tu m'envoies le XLSX
Export **XLSX file** depuis VideoAsk, puis tu me l'envoies. Je lis les colonnes réellement présentes (nom, email, téléphone, liens vidéo/audio) au lieu de les deviner.

### 2. Je vérifie que les liens sont téléchargeables
Je teste le téléchargement de 2-3 liens média avant d'aller plus loin. Si ça répond `403`, on bascule immédiatement sur l'archive ZIP **All data** et tu me l'envoies à la place.

### 3. Sélection des 10 candidats
Les 10 plus récents ayant un lien média fonctionnel. Je te montre la liste (nom, email, téléphone) pour validation avant toute écriture en base.

### 4. Création des fiches candidats
Pour chacun, une ligne dans les sessions du poste Tango :
- nom, e-mail, téléphone repris du XLSX ;
- statut **terminé** (l'entretien a déjà eu lieu chez VideoAsk) ;
- aucune invitation, aucun lien candidat généré, aucun envoi.

**Garde-fou e-mail** : les envois automatiques du parcours candidat sont déclenchés par la finalisation de session côté candidat. L'import écrit directement en base sans passer par ce chemin, et je vérifierai après import que le journal d'envoi ne contient aucune ligne pour ces adresses.

### 5. Import de la vidéo
La vidéo est déposée dans le stockage Interw et rattachée à la fiche comme réponse unique du candidat (monologue, comme dans nos tests manuels).

### 6. Transcription et scoring avec le vrai moteur Interw
C'est le point que tu as soulevé : mes analyses de Célia, Justine et Alissa passaient par le chat, pas par la plateforme. Ici on utilise la chaîne réelle :
- `transcribe-session` pour la transcription horodatée ;
- puis génération de la matrice et du rapport avec les critères et pondérations du poste.

Tu obtiens donc exactement les mêmes fiches candidats, matrices et rapports que pour un entretien passé dans Interw.

### 7. Vérification
Je te livre un récapitulatif : 10 fiches créées, scores obtenus, comparaison avec les notes manuelles de Célia / Justine / Alissa pour mesurer l'écart entre le chat et le moteur Interw. Et confirmation qu'aucun e-mail n'est parti.

## Détails techniques

- Traitement ponctuel, hors interface : aucun bouton d'import ajouté pour l'instant. On industrialise seulement si le test est concluant.
- Écritures : `sessions` (statut `completed`, `candidate_name`, `candidate_email`, `candidate_phone`) et `session_messages` (rôle `candidate`, `video_segment_url`) pour le poste `eb7db435-1f2f-4ccf-a2ff-f49d68f851db`.
- Attention : un déclencheur enfile automatiquement un travail de rapport quand une session passe en `completed`. C'est ce qu'on veut ici (le rapport se génère), et ce chemin n'envoie pas d'e-mail candidat — l'envoi de remerciement passe par la finalisation côté candidat, que l'import ne touche pas.
- Stockage : bucket `media`, chemin `interviews/<session_id>/q0.mp4`.
- Aucun appel aux fonctions d'envoi d'e-mail (`send-candidate-message`, `resend-candidate-thank-you`, `finalize-session`).
- Rollback : les 10 sessions créées sont identifiables par leur date de création et supprimables en une opération si le test ne convient pas.

## Ce dont j'ai besoin de toi

Le fichier **XLSX** exporté depuis VideoAsk pour le poste « Vidéo présentation ». Dès que je l'ai, je démarre à l'étape 2.

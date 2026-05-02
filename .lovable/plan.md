## Bien meilleure approche, validée

Tu as raison : plutôt que de bricoler la transcription navigateur (qui sera toujours fragile), on s'appuie sur la **source de vérité** déjà disponible — chaque réponse candidat a son segment vidéo enregistré (`video_segment_url`). Gemini sait lire directement l'audio d'une vidéo et produire une transcription propre, sans doublons, ponctuée correctement.

C'est la bonne architecture : la Web Speech API du navigateur sert seulement à l'**affichage en direct** pendant l'entretien (UX), et la **transcription officielle** est générée à la fin par Gemini en lisant les vidéos.

## Plan

### 1. Nouvelle fonction backend `transcribe-session`
- Déclenchée automatiquement à la fin d'une session, et aussi manuellement depuis la page de détail (bouton « Re-transcrire »).
- Pour chaque message candidat ayant un segment vidéo :
  - Télécharge la vidéo depuis le stockage privé.
  - L'envoie à Gemini avec une consigne stricte : « transcris exactement ce que dit la personne, en français, sans reformulation, avec ponctuation correcte ».
  - Remplace le `content` du message par la transcription propre.
- Conserve l'ancien texte (Web Speech) dans une nouvelle colonne `content_raw` pour pouvoir comparer ou revenir en arrière.
- Gère les segments longs en découpant si nécessaire et en concaténant.

### 2. Déclenchement automatique
- À la fin de l'entretien, juste avant de générer le rapport, on lance la transcription Gemini.
- Le rapport est ensuite généré sur la base de la **transcription propre**, donc beaucoup plus fiable (les répétitions actuelles polluent l'analyse IA).

### 3. Bouton manuel pour les sessions existantes
- Sur la page détail de session (RH), un bouton « Re-transcrire les vidéos » qui rejoue la transcription Gemini sur toute la session.
- Affichage d'un état clair : en cours, terminé, échec par segment.
- Permet de réparer rétroactivement la session que tu m'as montrée et toutes les autres.

### 4. UX pendant l'entretien
- On garde la transcription en direct du navigateur **uniquement pour l'affichage temps réel** (le candidat voit ce qu'il dit).
- On **arrête de l'envoyer telle quelle** en base comme version finale : elle sert de placeholder, remplacée à la fin par la version Gemini.
- Affichage clair côté RH : « Transcription en cours d'amélioration… » tant que Gemini n'a pas fini, puis bascule automatique sur la version propre.

### 5. Sécurité et coûts
- La fonction vérifie que l'appelant est membre de l'organisation propriétaire de la session.
- Téléchargement des vidéos via URL signée temporaire, jamais publique.
- Repli silencieux si Gemini est indisponible : on garde la transcription navigateur (dédoublonnée a minima côté serveur) plutôt que de bloquer.
- Modèle : `google/gemini-2.5-flash` (lit l'audio/vidéo, rapide, coût raisonnable). Repli sur `google/gemini-2.5-pro` si la qualité audio est mauvaise.

## Résultat attendu
- Transcriptions propres, sans répétitions, avec vraie ponctuation.
- Rapports d'entretien beaucoup plus fiables, basés sur ce que le candidat a **réellement dit**.
- Possibilité de réparer toutes les sessions passées en un clic.
- L'expérience candidat reste identique : transcription live à l'écran, rien ne change pour lui.

## Détail technique
- Nouvelle fonction : `supabase/functions/transcribe-session/index.ts`
- Migration : ajout de `content_raw` (text, nullable) et `transcription_status` (enum: pending/processing/done/failed) sur `session_messages`.
- Modifications client :
  - `src/pages/InterviewStart.tsx` — déclenche `transcribe-session` à la fin, avant `generate-report`.
  - `src/pages/SessionDetail.tsx` et `src/pages/SharedReport.tsx` — bouton de re-transcription + indicateur d'état.
- `generate-report` : attend que la transcription soit terminée avant de générer le rapport (ou utilise le texte déjà nettoyé si déjà fait).
- API Gemini multimodal : envoi de la vidéo en base64 ou via `fileData` selon la taille, avec prompt strict de transcription verbatim.

Si tu approuves, je passe à l'implémentation.
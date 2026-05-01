## Objectif

Remplacer le téléchargement ZIP côté navigateur (lent, FFmpeg.wasm dans le navigateur) par un traitement côté serveur. Le RH clique sur « Télécharger les vidéos », confirme dans une pop-up, et reçoit un email avec un lien de téléchargement quand l'archive est prête.

## Flux utilisateur

1. Clic sur « Télécharger les vidéos » dans le rapport.
2. Pop-up de confirmation :
   - Titre : « Préparation de l'archive vidéo »
   - Texte : « La conversion des vidéos en MP4 peut prendre plusieurs minutes. Vous recevrez un email à `<email du RH>` avec un lien de téléchargement dès que l'archive sera prête. »
   - Boutons : « Annuler » / « Confirmer »
3. Au clic Confirmer : appel d'une edge function qui enregistre la demande en base, retourne immédiatement un toast de succès (« Demande enregistrée, vous recevrez un email »).
4. Un worker côté serveur (edge function programmée) traite les demandes en attente : télécharge les segments depuis Supabase Storage, convertit en MP4 avec FFmpeg, ré-uploade le ZIP dans Storage, génère une URL signée valable 7 jours, envoie l'email transactionnel.

## Architecture serveur

### Nouvelle table `video_export_jobs`

Colonnes : `id`, `session_id`, `requested_by` (user_id), `recipient_email`, `status` (`pending` / `processing` / `ready` / `failed`), `zip_path` (chemin Storage), `download_url`, `error_message`, `created_at`, `started_at`, `completed_at`, `expires_at`.

RLS : un utilisateur de l'organisation propriétaire de la session peut créer/lire ses propres jobs.

### Nouveau bucket Storage `video-exports` (privé)

Stocke les ZIP générés. URLs signées 7 jours. Politique : accès via service role uniquement (les utilisateurs reçoivent une URL signée par email).

### Nouvelle edge function `request-video-export`

- Vérifie l'authentification + l'accès à la session.
- Insère un job `pending` dans `video_export_jobs`.
- Déclenche immédiatement `process-video-export` en arrière-plan (`fetch` sans await, ou via un cron pgmq).
- Retourne `{ jobId }`.

### Nouvelle edge function `process-video-export`

- Lit un job `pending`, passe à `processing`.
- Télécharge les segments depuis le bucket `media`.
- Convertit en MP4 via FFmpeg (binaire Deno : `ffmpeg-static` ou utilisation de l'API Lovable AI si non disponible — à confirmer pendant l'implémentation, sinon fallback : zip des WebM originaux + README expliquant le format).
- Génère le README (même contenu qu'aujourd'hui).
- Upload le ZIP dans `video-exports/<org_id>/<session_id>/<job_id>.zip`.
- Crée une URL signée 7 jours.
- Met à jour le job en `ready`.
- Appelle `send-transactional-email` avec le template `video-export-ready`.

### Nouveau template email `video-export-ready`

Template React Email sobre (charte InterviewAI : indigo, Inter), props : `candidateName`, `projectTitle`, `downloadUrl`, `expiresAt`. Bouton « Télécharger l'archive ». Mentionne l'expiration 7 jours.

### Note sur FFmpeg côté serveur

FFmpeg n'est pas disponible nativement dans Deno Deploy (Edge Functions). Deux options à valider à l'implémentation :
- **Option A (préférée)** : utiliser un binaire FFmpeg via WASM côté Edge Function (même approche qu'actuellement mais exécutée côté serveur, plus rapide car réseau direct entre Storage et Edge).
- **Option B (fallback simple)** : ne pas convertir, livrer les WebM originaux dans le ZIP. Le README explique que les fichiers se lisent avec VLC / Chrome / Firefox. C'est rapide, fiable, et la majorité des lecteurs modernes ouvrent le WebM.

Recommandation : commencer avec l'**Option B** (livraison WebM, traitement quasi-instantané côté serveur, email envoyé en quelques secondes). Si le besoin MP4 reste critique, ajouter la conversion WASM dans une seconde itération.

## Modifications côté client

### `src/pages/SessionDetail.tsx`
- Remplacer `handleDownloadFullVideo` (~220 lignes de code FFmpeg.wasm + JSZip) par un simple appel à `request-video-export`.
- Ajouter un `AlertDialog` shadcn de confirmation avant l'appel.
- Texte du dialog en français sobre, sans franglais.
- Supprimer les imports `JSZip` et `videoConvert`.

### Suppression possible
- `src/lib/videoConvert.ts` n'est plus utilisé (à supprimer).
- `public/ffmpeg/*` peut être retiré du bundle public (gain de ~30 Mo téléchargés par les RH).

## Sécurité
- RLS sur `video_export_jobs` : seuls les membres de l'organisation propriétaire de la session peuvent créer/lire un job.
- Bucket `video-exports` privé, accès uniquement via URL signée envoyée par email.
- Le job vérifie côté serveur que `requested_by` a bien accès à la session avant de générer l'archive.

## Fichiers impactés
- **Migration SQL** : table `video_export_jobs` + bucket `video-exports` + RLS.
- **Nouvelles edge functions** : `request-video-export`, `process-video-export`.
- **Nouveau template email** : `_shared/transactional-email-templates/video-export-ready.tsx` + ajout au registry.
- **Modifié** : `src/pages/SessionDetail.tsx` (simplification massive).
- **Supprimé** : `src/lib/videoConvert.ts`, `public/ffmpeg/*`.

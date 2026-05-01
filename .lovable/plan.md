## Téléchargement vidéo dans un nouvel onglet avec barre de progression

### Comportement

Clic sur "Télécharger les vidéos" → ouverture d'un nouvel onglet `/sessions/:id/export` qui :
1. Récupère les segments vidéo candidat de la session.
2. Les télécharge un par un en affichant une barre de progression (% basé sur les octets reçus).
3. Construit le ZIP côté navigateur avec JSZip.
4. Déclenche le téléchargement automatique de l'archive.
5. Affiche un bouton "Fermer l'onglet" à la fin.

### Phases affichées

```
[1/3] Préparation                 (métadonnées)
[2/3] Téléchargement des segments (0 → 80 %)
[3/3] Création de l'archive ZIP   (80 → 100 %)
Terminé → "Télécharger l'archive"
```

### Format des fichiers

On garde le format natif du segment (`.webm` ou `.mp4`) détecté via le `Content-Type` de la réponse, fallback sur l'URL. Pas de transcodage côté client (ffmpeg.wasm trop lourd). README inclus expliquant le format et listant chaque fichier avec sa question.

### Nettoyage de l'ancien système (email + edge function)

- Supprimer la edge function `request-video-export`.
- Supprimer le template `video-export-ready` + son entrée dans `registry.ts`.
- Supprimer la table `video_export_jobs` et le bucket `video-exports` via migration.
- Retirer l'`AlertDialog` de confirmation et la logique d'invocation dans `SessionDetail.tsx`.

### Fichiers

**Créés**
- `src/pages/SessionVideoExport.tsx` — page plein écran avec barre de progression, route protégée RH, sans sidebar.

**Modifiés**
- `src/App.tsx` — ajout de la route `/sessions/:id/export` (protégée).
- `src/pages/SessionDetail.tsx` — bouton ouvre l'onglet, suppression dialog/logique export.
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — retrait `video-export-ready`.

**Supprimés**
- `supabase/functions/request-video-export/index.ts`
- `supabase/functions/_shared/transactional-email-templates/video-export-ready.tsx`

**Migration**
- `DROP TABLE public.video_export_jobs;`
- Suppression du bucket `video-exports` et de ses policies.

### Avantages

- Feedback visuel immédiat, pas d'attente email.
- Pas de stockage serveur d'archives (mieux côté RGPD).
- L'onglet principal reste utilisable.

### Limite assumée

Le ZIP est construit en mémoire dans l'onglet : confortable jusqu'à ~500 Mo (cas typique). Au-delà, Chrome peut limiter — mais pour un entretien standard c'est largement suffisant.

## Objectif

Ajouter un bouton **"Télécharger la vidéo"** dans le header de la page session (`/sessions/:id`). Au clic, on assemble tous les segments vidéo de la session (réponses candidat + IA si disponibles, dans l'ordre) en un seul fichier `.mp4` que le recruteur télécharge.

## Comportement utilisateur

1. Bouton visible dans le header à côté de "Partager", uniquement si la session contient au moins un segment vidéo.
2. Clic → état "Préparation… (peut prendre jusqu'à 2 minutes)" avec spinner, bouton désactivé.
3. Une fois prêt → téléchargement automatique du fichier `entretien-{nom-candidat}-{date}.mp4`.
4. En cas d'erreur → toast explicite, bouton réactivé.
5. Mise en cache : si une vidéo fusionnée a déjà été générée pour cette session, on la sert directement sans relancer ffmpeg.

## Architecture technique

### 1. Stockage

- Nouveau bucket privé `merged-videos` (RLS : seuls les RH de l'organisation propriétaire de la session peuvent lire ; insert réservé à la service-role via l'edge function).
- Colonne `merged_video_url` (text, nullable) ajoutée à la table `sessions` pour mémoriser l'URL de la vidéo fusionnée déjà générée.

### 2. Edge function `merge-session-video`

Fichier : `supabase/functions/merge-session-video/index.ts`

- Input : `{ sessionId: string }`
- Auth : valide le JWT, vérifie que l'utilisateur a accès à la session via son `organization_id` (pattern existant `has_role` + appartenance projet).
- Logique :
  1. Si `sessions.merged_video_url` existe et que le fichier est toujours dans le bucket → renvoie l'URL signée directement.
  2. Sinon : récupère tous les `session_messages` de la session avec un `video_segment_url`, triés par `timestamp`. On inclut les segments IA et candidat pour avoir l'entretien complet ; on exclut les follow-ups vides.
  3. Télécharge chaque segment depuis le bucket existant (`session-recordings` ou équivalent) dans `/tmp`.
  4. Lance `ffmpeg` via le binaire Deno (`ffmpeg-static` n'existe pas en Deno → on utilise `Deno.Command` avec ffmpeg disponible dans le runtime Edge Functions, qui inclut ffmpeg natif). Concat via `concat demuxer` :
     ```
     ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
     ```
     Si l'encodage des segments diffère (codecs différents) → fallback réencodage : `-c:v libx264 -c:a aac`.
  5. Upload du `output.mp4` vers `merged-videos/{sessionId}.mp4`.
  6. Met à jour `sessions.merged_video_url` avec une URL signée longue durée (7 jours, régénérée à chaque appel).
  7. Renvoie `{ url: string }`.

> Note : si le runtime Deno Edge Functions de Supabase n'expose pas ffmpeg en binaire système, on utilisera `https://deno.land/x/ffmpeg` ou on bascule sur `mp4box.js` côté Edge. À confirmer au moment de l'implémentation ; un fallback ZIP-des-segments restera disponible si ffmpeg n'est pas accessible.

### 3. Frontend

`src/pages/SessionDetail.tsx` :
- Nouveau bouton dans le header (à côté de "Partager") :
  ```tsx
  <Button variant="outline" size="sm" onClick={handleDownloadVideo} disabled={downloading}>
    <Download className="mr-1 h-4 w-4" />
    {downloading ? "Préparation…" : "Télécharger la vidéo"}
  </Button>
  ```
- Handler : appelle `supabase.functions.invoke("merge-session-video", { body: { sessionId } })`, puis déclenche le téléchargement via un `<a download>` programmatique.
- Affiché uniquement si `candidateVideos.length > 0` ou `session.video_recording_url` existe.

### 4. Migration SQL

```sql
alter table public.sessions add column if not exists merged_video_url text;

insert into storage.buckets (id, name, public)
values ('merged-videos', 'merged-videos', false)
on conflict (id) do nothing;

-- RLS bucket : lecture par les membres de l'org propriétaire de la session
create policy "RH read merged videos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'merged-videos'
  and exists (
    select 1 from public.sessions s
    join public.projects p on p.id = s.project_id
    where (storage.foldername(name))[1] = s.id::text
      and p.organization_id = public.get_user_org_id(auth.uid())
  )
);
```

## Fichiers touchés

- **Créés** :
  - `supabase/functions/merge-session-video/index.ts`
  - `supabase/migrations/{timestamp}_merged_video.sql`
- **Modifiés** :
  - `src/pages/SessionDetail.tsx` (bouton + handler)

## Limites assumées

- Génération synchrone (jusqu'à ~2 min pour des entretiens longs). Si le timeout edge function (150s) est dépassé pour de très longs entretiens, on basculera vers un job asynchrone dans une itération ultérieure.
- La vidéo fusionnée est mise en cache → les appels suivants sont instantanés.

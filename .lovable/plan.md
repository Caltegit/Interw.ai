## Réduire la taille des vidéos et fiabiliser l'analyse corporelle

### 1. `src/pages/InterviewStart.tsx`
- Bitrate vidéo : `800_000` → `500_000` (audio inchangé à 64 kbps).
- Contraintes `getUserMedia` (là où le stream est demandé) : ajouter `width: { ideal: 640 }`, `height: { ideal: 480 }`, `frameRate: { ideal: 24 }` pour éviter le 1080p inutile.

Gain : poids divisé par ~1,6 à 2 → une réponse de 1 min passe d'environ 6,5 Mo à ~3,5 Mo.

### 2. `supabase/functions/analyze-nonverbal/index.ts`
- `MAX_BYTES_PER_SEGMENT` : 4 Mo → **15 Mo** (Gemini via la passerelle accepte largement plus, MAX_SEGMENTS = 2 garde la marge mémoire edge).
- Quand `record_video = false`, écrire en base `nonverbal_analysis = { status: "video_not_recorded" }` au lieu d'un simple retour HTTP, pour que l'UI ait toujours une raison stable.
- Conserver dans le JSONB les segments écartés et leur motif (`too_large`, `fetch_failed`) pour debug.

### 3. `src/components/session/NonverbalTabContent.tsx`
- Lire `analysis.reason` en plus de `analysis.status` et afficher un libellé précis :
  - `no_video` → "Aucun segment vidéo trouvé pour cette session."
  - `not_enough_video` → "Les segments vidéo étaient trop volumineux ou indisponibles."
  - `video_not_recorded` → "L'enregistrement vidéo n'était pas activé pour ce projet." (pas de bouton)
  - `failed` → message + `analysis.error` discret sous le bouton.
- **Bouton "Relancer l'analyse" toujours visible** sauf pour `video_not_recorded` (et pendant `running`).

Aucune migration DB nécessaire (tout passe par le JSONB existant `reports.nonverbal_analysis`).
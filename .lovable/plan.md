# Corriger le crash mémoire et relancer le recalibrage attitude

## Contexte

Le batch précédent a échoué : l'edge function `analyze-nonverbal` plante avec **"Memory limit exceeded"** dès qu'on lui passe 4 segments vidéo (anciennement 2). Les 50 sessions n'ont donc pas été re-analysées — les scores actuels (gestures 2.94, eye 4.86) reflètent l'ancien prompt.

Cause : 4 segments × ~15 Mo binaire + base64 (×1.33) tenus simultanément en RAM dépassent les 256 Mo alloués à une edge function.

## Changements

### 1. `supabase/functions/analyze-nonverbal/index.ts` — réduire l'empreinte mémoire

- `MAX_BYTES_PER_SEGMENT` : 15 Mo → **6 Mo** (segment ignoré au-delà)
- `MAX_TOTAL_BYTES` : 50 Mo → **20 Mo** (garde-fou global)
- `MAX_SEGMENTS` reste à **4** (la distribution début/milieu/fin reste la valeur ajoutée)
- Refactor de la boucle d'encodage : encoder en base64 puis **libérer explicitement** `buf` et `blob` (mise à `null`) avant de passer au segment suivant, pour que le GC récupère la mémoire entre segments
- Skipper proprement tout segment > 6 Mo (déjà loggué dans `skipped_segments`)

Aucun changement de prompt, de schéma, ou d'UI.

### 2. Nettoyer la session orpheline

Une session avait `nonverbal_analysis.status = "running"` figée. Migration courte pour la marquer `failed` afin qu'elle soit réincluse dans le prochain batch.

### 3. Redéployer + relancer le batch

- Redéployer `analyze-nonverbal`
- Rappeler `replay-nonverbal-batch` avec `limit: 50`
- Attendre ~10 min puis vérifier :
  - Plus de "Memory limit exceeded" dans les logs
  - Timestamps `generated_at` regroupés sur la fenêtre du batch
  - Moyennes attendues : gestures ~6-7, eye ~6-7, posture ~6-7, face ~7

### 4. Si le crash mémoire persiste malgré 6 Mo × 4

Plan B (non appliqué d'office) : passer à **3 segments** (start/middle/end strict) au lieu de 4. À décider après vérification des logs.

## Hors scope

- Pas de changement de prompt, de rubrique, ou de mapping UI (déjà fait)
- Pas de nouveau seuil d'affichage tant que la distribution post-batch n'est pas observée

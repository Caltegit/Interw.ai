# Plan : améliorer la qualité et stabilité de la voix ElevenLabs

## Objectif
1. Améliorer la qualité timbrale (réduire la variation entre Q1 et les questions suivantes)
2. Solidifier le pipeline TTS avec retry avant fallback navigateur
3. Quand le fallback `speechSynthesis` se déclenche, choisir une voix système du bon genre (féminine ou masculine) selon la configuration de la session
4. Compenser la latence supplémentaire par du préchargement

## Changements

### 1. Backend — `supabase/functions/tts-elevenlabs/index.ts`
- Remplacer `model_id: "eleven_flash_v2_5"` par `model_id: "eleven_turbo_v2_5"`
- Monter `stability: 0.6` → `stability: 0.75` (timbre plus consistant entre générations)

### 2. Frontend — `src/pages/InterviewStart.tsx`

**a) Retry x3 sur `fetchElevenLabsBlob`**
- Si l'appel échoue (timeout, erreur réseau, statut non-OK), retenter jusqu'à 3 fois avec backoff progressif (300ms, 600ms, 1200ms)
- Si les 3 tentatives échouent, logger `interview_tts_fallback_browser` avec le contexte (greeting / question / relance / transition)
- Ensuite seulement, basculer sur `speechSynthesis`

**b) Précharger le greeting Q1 dès le boot** (compense les +225ms de Turbo)
- Au moment du warm-up TTS (~ligne 1965), lancer en parallèle `fetchElevenLabsBlob(greeting)` et stocker le blob dans une `ref`
- Au moment de jouer le greeting (~ligne 2028), utiliser le blob préchargé via `prefetchedBlob` au lieu de refetch

**c) Sélection genrée de la voix `speechSynthesis`**
- Lire le genre de la voix configurée pour la session (via `project.tts_voice_id` mappé sur les listes `FEMALE_VOICES` / `MALE_VOICES` de `VoiceSelectorDialog.tsx`, ou ajouter un champ `tts_voice_gender` dans `projects` si plus simple)
- Dans la fonction `speak()` (~lignes 920-978), filtrer `window.speechSynthesis.getVoices()` :
  - Préférer une voix `lang.startsWith("fr")`
  - Filtrer par genre via la propriété `voice.name` (heuristique : "Amélie", "Audrey", "Marie", "Aurélie", "Virginie" = féminin ; "Thomas", "Daniel", "Nicolas" = masculin) ou via `voice.gender` quand disponible
  - Fallback : première voix française disponible si aucune correspondance de genre
- Mémoriser la voix choisie pour la session (pas de re-sélection à chaque appel)

## Détails techniques

| Fichier | Modification |
|---|---|
| `supabase/functions/tts-elevenlabs/index.ts` | `model_id` + `stability` |
| `src/pages/InterviewStart.tsx` | Retry x3, préchargement greeting, sélection voix `speechSynthesis` selon genre |
| `src/lib/voiceGender.ts` (nouveau) | Helper qui mappe un `voiceId` ElevenLabs vers `"female" \| "male"` (utilise les constantes de `VoiceSelectorDialog.tsx`) |

## Validation après déploiement
1. Démarrer un entretien et vérifier que la voix Q1 = voix Q2/Q3 (même timbre)
2. Vérifier dans la console qu'aucun `interview_tts_fallback_browser` n'apparaît en conditions normales
3. Test du fallback : bloquer temporairement l'edge function `tts-elevenlabs` (ex. via DevTools) et vérifier que la voix système qui prend le relais correspond au genre configuré
4. Vérifier les logs de `tts-elevenlabs` pour confirmer `eleven_turbo_v2_5`

## Coût
Inchangé : Flash v2.5 et Turbo v2.5 sont au même tarif (~500 crédits / 1000 caractères).

## Hors scope
- Changement de voix ou de provider TTS
- Modification des phrases de transition statiques
- Refonte du système de cache TTS

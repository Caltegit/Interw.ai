## Diagnostic

Les boutons « Voir le moment » utilisent un champ `start_seconds` que l'IA **estime** à partir d'une heuristique très approximative (`generate-report/index.ts` ligne 289) :

> « Estime à partir de la position du texte cité dans la transcription du message, en supposant un débit de ~160 mots/minute »

Aucune vraie donnée temporelle n'est stockée. La fonction `transcribe-session` demande seulement du texte brut à Gemini, sans horodatage. Conséquence : la valeur retournée est souvent fausse (souvent ~0 ou très éloignée de la réalité), donc le lecteur démarre près du début du clip.

Vérifié en base : les `start_seconds` retournés sont bien présents mais incohérents (0, 12, 43, 54… sans corrélation fiable avec le contenu).

## Correctif

Passer d'une estimation à de **vrais timestamps** issus de Gemini, puis recalculer côté serveur le `start_seconds` exact à partir de la citation.

### 1. Transcription horodatée (`supabase/functions/transcribe-session/index.ts`)

- Modifier le prompt pour demander à Gemini une transcription **segmentée avec horodatage** (format JSON : `[{"start": 0, "end": 4.2, "text": "..."}]`), un segment ≈ 1 phrase ou ~5 s.
- Parser la réponse, stocker :
  - `content` : texte concaténé (inchangé pour le reste de l'app)
  - **nouvelle colonne** `transcript_segments JSONB` sur `session_messages` (array de `{start, end, text}`)
- Garder un fallback texte brut si le parsing échoue.

### 2. Migration DB

- Ajouter `transcript_segments JSONB NULL` à `session_messages`. Pas de RLS à toucher (héritée).

### 3. Recalcul déterministe dans `generate-report/index.ts`

- Charger `transcript_segments` avec les messages.
- Après réception du JSON de l'IA, post-traiter chaque entrée qui contient `message_id`/`evidence_message_id` + une citation (`quote`/`citation`/`key_quote`/`evidence_quote`) :
  - Trouver dans `transcript_segments` du message le segment dont `text` contient (matching tolérant : minuscules, sans ponctuation, premiers ~6 mots de la citation) la citation.
  - Remplacer `start_seconds` par le `start` du segment trouvé (sinon laisser la valeur de l'IA en fallback).
- Appliquer aux blocs : `decision_drivers`, `fit_breakdown`, `signals`, `red_flags`, `soft_skills` (`evidence_start_seconds`), `personality_profile.evidences`, `communication_profile.dimensions`, `paraverbal_analysis.dimensions`, `highlight_clips`.
- Simplifier le prompt : retirer la consigne d'estimer à 160 wpm (devient inutile).

### 4. Compatibilité ascendante

- Les anciens rapports gardent leurs valeurs estimées (rien à migrer).
- Les nouveaux rapports/transcriptions bénéficient automatiquement des bons timestamps.
- Aucun changement front nécessaire (le navigateur vidéo continue d'utiliser `startSeconds - 5 s`).

## Hors-scope

- Pas de retraitement rétroactif des sessions déjà transcrites (proposable plus tard via un bouton « re-transcrire »).
- Pas de modification UI.

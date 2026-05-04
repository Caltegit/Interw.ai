## Objectif
Ajouter une section "Voix clonée" dans `/settings` permettant à un utilisateur de cloner sa voix via ElevenLabs (Instant Voice Cloning), puis de l'utiliser comme voix TTS dans ses projets.

## Architecture

```text
Settings page
  └─ Card "Ma voix clonée"
       ├─ Si pas de voix : bouton "Cloner ma voix"
       │     └─ Dialog : enregistrement micro (60-90s) + consentement RGPD
       │           └─ POST → edge fn `clone-voice` → ElevenLabs voices/add
       │                 └─ stocke voice_id dans profiles.cloned_voice_id
       └─ Si voix existante : preview (bouton lecture) + bouton "Supprimer"
             └─ DELETE → edge fn `delete-cloned-voice` → ElevenLabs voices/{id}
```

## Étapes d'implémentation

### 1. Base de données (migration)
Ajouter à `profiles` :
- `cloned_voice_id text` (ElevenLabs voice_id)
- `cloned_voice_name text`
- `cloned_voice_created_at timestamptz`
- `cloned_voice_consent_at timestamptz` (preuve consentement RGPD)

### 2. Edge function `clone-voice`
- Auth requise (JWT)
- Reçoit : `FormData` avec sample audio (webm/mp3) + `name` + `consent: true`
- Valide : taille < 10MB, durée raisonnable, consentement = true
- POST vers `https://api.elevenlabs.io/v1/voices/add` (multipart) avec `xi-api-key`
- Stocke `voice_id` retourné dans `profiles` (service role)
- Retourne `{ voice_id, name }`

### 3. Edge function `delete-cloned-voice`
- Auth requise
- Lit `cloned_voice_id` depuis profile
- DELETE `https://api.elevenlabs.io/v1/voices/{voice_id}`
- Vide les champs dans `profiles`

### 4. Composant UI dans `Settings.tsx`
Nouvelle Card "Ma voix clonée" avec :
- Si aucune voix : bouton "Cloner ma voix" → ouvre `VoiceCloneDialog`
- `VoiceCloneDialog` :
  - Texte d'instruction (lire ~1 min, environnement calme)
  - Texte type à lire (paragraphe FR de ~150 mots)
  - Composant d'enregistrement (réutilise pattern de `MediaRecorderField`, audio uniquement)
  - Preview du sample avant envoi
  - Checkbox consentement RGPD obligatoire ("J'accepte que ma voix soit clonée et stockée par ElevenLabs…")
  - Bouton "Créer ma voix"
- Si voix existante :
  - Affiche nom + date de création
  - Bouton "Tester" (utilise `tts-elevenlabs` en mode preview avec le `voice_id` cloné)
  - Bouton "Supprimer" (avec confirmation)

### 5. Intégration dans le sélecteur de voix projet
Modifier `VoiceSelectorDialog` pour afficher la voix clonée de l'utilisateur en haut de la liste (badge "Ma voix") si `profile.cloned_voice_id` existe. Le `voice_id` cloné est déjà géré par `tts-elevenlabs` (lit `tts_voice_id` du projet).

## Sécurité & RGPD
- Consentement explicite stocké en DB avec timestamp
- Suppression possible à tout moment (droit à l'oubli)
- Voix isolée par utilisateur (un user = une voix clonée max dans MVP)
- Edge function service role pour update profile (RLS bloque sinon)

## Coût ElevenLabs (rappel)
- IVC inclus dans plan Creator (~22$/mois) : jusqu'à 30 voix clonées
- Génération TTS : compte sur le quota standard de caractères

## Hors scope (MVP)
- Pas de clonage pour autres membres de l'org (chaque user clone la sienne)
- Pas de gestion multi-voix par user
- Pas de Professional Voice Cloning (PVC, demande heures d'audio)

## Fichiers touchés
- `supabase/migrations/<timestamp>_add_cloned_voice_to_profiles.sql` (nouveau)
- `supabase/functions/clone-voice/index.ts` (nouveau)
- `supabase/functions/delete-cloned-voice/index.ts` (nouveau)
- `src/pages/Settings.tsx` (ajout Card)
- `src/components/settings/VoiceCloneDialog.tsx` (nouveau)
- `src/components/project/VoiceSelectorDialog.tsx` (ajout option voix clonée)

## Pré-requis
Le secret `ELEVENLABS_API_KEY` est déjà configuré (utilisé par `tts-elevenlabs`). Aucun nouveau secret nécessaire. Il faut vérifier que le plan ElevenLabs actif permet l'IVC (Creator+).

## Objectif

Ajouter **Gemini TTS** à la page de comparaison `/admin/tts-compare` qui contient déjà ElevenLabs (Charlotte) et OpenAI (Nova, Shimmer, Onyx).

## Pré-requis utilisateur

Tu dois ajouter manuellement la clé API Google AI Studio dans les secrets Lovable Cloud :
1. Settings projet → Cloud → Secrets
2. Ajouter `GEMINI_API_KEY` avec ta clé `AIza...`

(Le tool `add_secret` n'est pas disponible dans la session actuelle, donc ajout manuel.)

## Ce qui sera construit

### 1. Nouvelle edge function `tts-gemini-direct`
Fichier : `supabase/functions/tts-gemini-direct/index.ts`
- Appelle directement l'API Google AI Studio (`generativelanguage.googleapis.com`) avec le modèle `gemini-2.5-flash-preview-tts`
- Renvoie un fichier WAV (le PCM 24 kHz 16-bit retourné par Gemini est enveloppé dans un en-tête WAV côté serveur pour pouvoir être joué dans le navigateur)
- Sécurité identique à `tts-openai` : auth JWT + vérification rôle `super_admin`
- Voix supportées : Kore, Charon, Aoede, Puck, Leda, Orus + une trentaine d'autres voix prédéfinies Gemini

### 2. Mise à jour de la page `/admin/tts-compare`
Ajout de 3 candidats Gemini :
- **Gemini TTS — Kore** (féminine, posée)
- **Gemini TTS — Charon** (masculine, calme)
- **Gemini TTS — Aoede** (féminine, légère)

La page passera de 4 à **7 voix** comparées à l'aveugle, avec :
- Étiquettes A/B/C/D/E/F/G dans un ordre randomisé
- Coût estimé révélé après vote (Gemini ~0,01 €/1k car., gratuit dans le tier free)
- Provider révélé après vote (3 logos : ElevenLabs / OpenAI / Gemini)

### 3. Mise à jour de `supabase/config.toml`
Ajout du bloc `[functions.tts-gemini-direct] verify_jwt = false` (validation faite dans le code).

## Détail technique

- **Format Gemini** : `responseModalities: ["AUDIO"]` + `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`
- **Sample rate dynamique** : extrait du `mimeType` retourné (`audio/L16;rate=24000`)
- **Pas de cache, pas de stockage** : audio joué une fois et libéré
- **Tier gratuit Google AI Studio** : 15 req/min, 1M tokens/jour → largement suffisant pour les tests

## Fichiers touchés

- ✅ Créé : `supabase/functions/tts-gemini-direct/index.ts`
- ✏️ Modifié : `src/pages/AdminTtsCompare.tsx` (ajout des 3 voix Gemini + types Provider étendus)
- ✏️ Modifié : `supabase/config.toml` (déclaration de la nouvelle fonction)

## Hors scope

- Cartesia, Hume → si tu veux pousser plus loin après ce test
- Bascule du TTS de production → décision après vote à l'aveugle

Une fois validé, je crée la fonction, je l'ajoute à la page, je déploie. Tu pourras tester dès que tu auras ajouté la clé `GEMINI_API_KEY` dans les secrets.
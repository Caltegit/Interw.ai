# Réparer la voix TTS des entretiens (clé ElevenLabs invalide)

## Problème

La fonction `tts-elevenlabs` échoue en boucle (50 échecs en ~45 min) : ElevenLabs
rejette le secret `ELEVENLABS_API_KEY` car il contient un **identifiant de clé**
au lieu de la clé réelle (qui commence par `sk_`). Conséquence : les candidats
n'entendent pas la voix de l'IA pendant les entretiens.

## Pourquoi je ne peux pas le faire seul

La vraie clé ElevenLabs n'existe que dans le dashboard ElevenLabs du compte.
Il faut qu'un humain la régénère ou la copie là-bas. Aucune modification de code
n'est nécessaire : la fonction et le secret sont correctement câblés, seule la
**valeur** du secret est mauvaise.

## Plan d'action

### Étape 1 — Toi, dans ElevenLabs (2 min)
1. Aller sur https://elevenlabs.io → **Developers → API Keys**.
2. Soit copier la clé existante si elle est encore affichée, soit **créer une
   nouvelle clé** (recommandé) et supprimer l'ancienne.
3. La clé commence par `sk_...` — c'est cette valeur complète qu'il faut copier,
   pas le nom ni l'identifiant affiché à côté.

### Étape 2 — Moi, dans le projet
1. J'ouvre le formulaire sécurisé pour mettre à jour le secret
   `ELEVENLABS_API_KEY` (la valeur ne transite pas par le chat).
2. Tu colles la nouvelle clé.

### Étape 3 — Vérification
1. J'appelle la fonction `tts-elevenlabs` en mode preview avec un texte court.
2. Critère de succès : réponse `audio/mpeg` (et plus de `reason: api_error`).
3. Je vérifie aussi `clone-voice`, qui utilise la même clé.

## Hors périmètre

- Aucun changement de code, aucune migration, aucune republication nécessaire
  (les secrets sont lus à chaud par les fonctions).
- Le fallback TTS (OpenAI / Gemini) reste inchangé.

# Tester STT et TTS dès la page de test caméra/micro

## Contexte

Sur la session de Clément, le candidat est resté figé sur "Préparation…" à la Q2 (question texte). Cause : `recognition.start()` (Web Speech API) a échoué silencieusement après la transition, et l'UI n'avait pas de garde-fou.

La page `InterviewDeviceTest.tsx` teste aujourd'hui :
- la caméra
- le micro (volume)
- la connexion réseau
- le son (bip de sortie)

Mais **ni la reconnaissance vocale (STT) ni la synthèse vocale (TTS)** ne sont vérifiées. Or ce sont les deux briques qui font tomber l'entretien si elles échouent en cours de route.

## Objectif

Détecter l'incompatibilité STT/TTS **avant** que le candidat lance la session, sur la page de test, avec un message clair et actionnable. Si ça échoue ici, on l'empêche de continuer (ou on lui propose un navigateur compatible).

## Changements

### 1. `src/pages/InterviewDeviceTest.tsx` — ajouter 2 tests

**Test "Reconnaissance vocale"**
- Vérifier la présence de `SpeechRecognition` ou `webkitSpeechRecognition`.
- Si absent : statut `error` → "Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari récent."
- Si présent : créer une instance, lancer `start()` dans un try/catch pendant 2 s, écouter `onstart` ou `onerror`, puis `stop()`.
  - `onstart` reçu → statut `ok`.
  - `onerror` ou exception → statut `error` avec message lisible (`not-allowed` → "Autorisez le micro", autre → "La reconnaissance vocale n'a pas pu démarrer sur ce navigateur").

**Test "Voix de l'IA"**
- Si le projet utilise ElevenLabs (`project.tts_provider === "elevenlabs"`) : faire un appel léger à l'edge function `tts-elevenlabs` avec un texte court ("Test") et vérifier qu'on récupère un blob audio jouable. Sinon `error` → "Le service de voix est indisponible, contactez le recruteur."
- Sinon (TTS navigateur) : vérifier `window.speechSynthesis` + au moins une voix `fr-*` dans `getVoices()` (avec un retry après 500 ms car les voix se chargent en async). Si aucune voix française → `warning` non bloquant ("Voix française indisponible, l'IA parlera dans la voix par défaut.").

### 2. UI

Ajouter ces 2 tests à la liste existante avec la même structure visuelle (icône + titre + statut). Garder la même logique : tant qu'au moins un test critique est en `error`, le bouton "Démarrer l'entretien" est désactivé avec une explication.

Les statuts critiques bloquants : caméra, micro, réseau, **reconnaissance vocale**, **voix de l'IA** (si ElevenLabs).
Statut non bloquant (warning seulement) : voix de l'IA en mode navigateur sans voix FR.

### 3. `src/pages/InterviewStart.tsx` — garde-fou de dernier recours

Même si on filtre en amont, on garde un filet de sécurité au cas où la STT casse en cours de session :
- Wrapper `recognition.start()` dans `startListening()` avec try/catch (aujourd'hui non protégé).
- Si après une transition l'UI reste 4 s avec `!isListening && !isSpeaking && !isProcessing && !interviewFinished`, afficher un bandeau "L'écoute du micro n'a pas démarré" avec un bouton "Réessayer le micro" (relance `startListening()`) et le bouton "Passer la question" déjà existant.
- Logger `interview_stuck_after_transition` pour le monitoring.

## Hors scope

- Pas de changement DB.
- Pas de modification du flow d'entretien lui-même (questions, IA, enregistrement).

## Test manuel

1. Ouvrir la page de test depuis Safari iOS (STT non supporté historiquement) → le test "Reconnaissance vocale" doit échouer et bloquer le bouton.
2. Refuser l'autorisation micro → test STT en `error` avec message clair.
3. Sur Chrome desktop avec micro OK → tous les tests passent, bouton actif.
4. Bonus : couper le réseau pendant le test ElevenLabs → test "Voix de l'IA" en `error`.

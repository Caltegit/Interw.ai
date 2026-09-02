# Améliorer la voix IA de fin d'entretien ("Merci beaucoup…")

## Diagnostic (constats dans le code)

Le message de clôture passe par la même fonction `speak()` que le reste de l'entretien (`InterviewStart.tsx`) :

1. **Tentative ElevenLabs** via l'edge function `tts-elevenlabs` — voix clonée du poste, ou voix par défaut "Charlotte FR".
2. **Repli navigateur** (`speechSynthesis`) si ElevenLabs échoue — cette voix système est **très robotique**, et le basculement est silencieux (juste un `console.warn`).

Trois causes possibles de l'effet "robotique" :

- **A. Repli navigateur** : ElevenLabs a échoué (réseau, quota, voix clonée indisponible) et le navigateur a pris le relais sans que personne ne le sache.
- **B. Réglages trop "plats"** : la fonction force `stability: 0.75`, `style: 0.0` — volontairement monotone et sans émotion, ce qui se remarque surtout sur un message de remerciement qui devrait être chaleureux.
- **C. Voix clonée de mauvaise qualité** sur le poste concerné.

## Plan

### Étape 1 — Confirmer la cause
- Vérifier les logs de `tts-elevenlabs` : y a-t-il des erreurs / `skip` récents ?
- Identifier le poste concerné et sa voix configurée (clonée ou défaut).

### Étape 2 — Corrections

1. **Réglages expressifs pour la clôture** : ajouter un paramètre `context: "closing"` à `tts-elevenlabs`. Pour ce contexte, passer `stability` à ~0.45 et `style` à ~0.3 (voix plus naturelle et chaleureuse), tout en gardant les réglages actuels pour les questions (où la neutralité est souhaitable).
2. **Modèle plus naturel pour la clôture** : utiliser `eleven_multilingual_v2` (plus expressif) au lieu de `eleven_turbo_v2_5` pour le seul message de fin — la latence importe peu à ce stade.
3. **Pré-génération de la clôture** : générer et mettre en cache l'audio du message de fin dès le début de l'entretien (le texte est prévisible), ce qui élimine le risque d'échec au moment critique.
4. **Télémétrie du repli** : remonter un événement `mic_events`/log serveur quand le repli navigateur se déclenche, pour détecter les sessions dégradées au lieu de le découvrir par hasard.

### Étape 3 — Validation
- Test bout-en-bout : lancer un entretien démo, écouter le message de fin, vérifier dans les logs que c'est bien ElevenLabs (et non le repli) qui l'a prononcé.

## Détails techniques

- Fichiers : `supabase/functions/tts-elevenlabs/index.ts` (paramètre `context`, réglages par contexte), `src/pages/InterviewStart.tsx` (passage du contexte lors du `speak(closing)`, pré-génération), `src/lib/ttsCache.ts` (cache de la clôture).
- Aucune migration base de données. Aucun changement sur les questions de l'entretien.
- Coût négligeable : un appel TTS supplémentaire en cache par session.

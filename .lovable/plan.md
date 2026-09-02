# Améliorer la voix IA de fin d'entretien ("Merci beaucoup…")

## Cause confirmée (vérifications faites)

Vérifications réalisées en base et dans le code :

- **La voix de fin passe bien par ElevenLabs, pas par la voix du navigateur.** 96 % des postes sont configurés en `tts_provider = elevenlabs` (99 postes sur 103), et la phrase de clôture `"Merci pour cette session, à bientôt."` fait partie des phrases préchargées et mises en cache au démarrage de l'entretien. La piste "repli navigateur" n'est donc pas la cause principale.
- **Les réglages de voix sont volontairement plats.** Dans `tts-elevenlabs`, tous les textes sont générés avec `stability: 0.75`, `style: 0.0`, `similarity_boost: 0.8` et le modèle rapide `eleven_turbo_v2_5`. C'est exactement le réglage qui produit une diction monocorde, sans variation d'intonation — imperceptible sur une question factuelle, très audible sur un "merci" qui devrait être chaleureux.
- **Le modèle utilisé est le modèle "rapide".** `eleven_turbo_v2_5` est optimisé pour la latence, au prix de l'expressivité. Sur le message de fin, la latence n'a aucune importance (le candidat a terminé).

**Conclusion : cause B — réglages trop neutres + modèle rapide, appliqués uniformément à tous les textes, y compris le message de clôture.**

Point non vérifiable en l'état : il n'existe aucune télémétrie sur les échecs TTS (l'événement `interview_tts_fallback_browser` n'est écrit qu'en console navigateur, jamais remonté au serveur, et aucun log récent n'est disponible pour la fonction). On ne peut donc pas exclure qu'une session isolée soit tombée sur la voix navigateur — d'où l'ajout de télémétrie proposé à l'étape 2.

## Plan (étapes 2 et 3 — à valider)


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

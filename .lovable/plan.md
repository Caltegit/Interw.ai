## Objectif
Basculer la synthèse vocale de l'IA recruteur de **ElevenLabs Multilingual v2** vers **Flash v2.5** pour réduire le coût TTS d'environ 45% (~$0.40 → $0.22 par entretien).

## Changement

**Fichier** : `supabase/functions/tts-elevenlabs/index.ts` (ligne 110)

Remplacer :
```ts
model_id: "eleven_multilingual_v2",
```
par :
```ts
model_id: "eleven_flash_v2_5",
```

Le reste de la fonction (voix, voice_settings, output_format, streaming) reste identique — Flash v2.5 est compatible avec les mêmes paramètres.

## Déploiement

La fonction `tts-elevenlabs` sera redéployée automatiquement. Effet immédiat sur les prochains entretiens.

## Hors scope (à confirmer plus tard si besoin)

- Pas de mode hybride (v2 pour les questions / Flash pour les relances) — on bascule tout en Flash.
- Pas de réglage des `voice_settings` — on garde la config actuelle.
- Pas de changement de voix.

## Rollback

Réversion en 1 ligne si la qualité ne convient pas en production.
## Objectif

La détection actuelle dans `src/hooks/useNetworkQuality.ts` bascule trop vite en `poor` (relances désactivées) à cause des appels TTS ElevenLabs : le premier appel subit un cold-start, et chaque mesure pèse 40 % dans la moyenne. Résultat : même sur une bonne connexion, le candidat voit régulièrement le message d'arrêt des relances.

On rend la détection plus tolérante, sans toucher au reste du système.

## Comportement attendu

- Une connexion fibre/4G correcte ne doit jamais tomber en `poor`.
- Seule une connexion réellement lente (≈ < 150 kbps soutenus, ou `2g` / `slow-2g` annoncé par le navigateur) déclenche le mode dégradé.
- Le premier appel TTS de la session n'influence plus la décision (cold-start ignoré).
- Une mesure isolée ne peut plus faire chuter le tier : il faut au moins 3 échantillons.

## Changements techniques

Fichier modifié : `src/hooks/useNetworkQuality.ts` uniquement.

1. **Ignorer la première mesure TTS**
   - Ajouter un compteur `samplesCountRef`. Le premier appel à `recordTtsTiming` n'alimente pas l'EWMA (juste incrément du compteur).

2. **Lisser davantage l'EWMA**
   - Passer `EWMA_ALPHA` de `0.4` à `0.15`. Les nouvelles mesures pèsent moins, les pics ponctuels disparaissent.

3. **Exiger 3 échantillons avant de dégrader**
   - Tant que `samplesCountRef.current < 3`, `tierFromKbps` ignore la valeur mesurée et retourne `good` (sauf si `effectiveType` vaut `2g` / `slow-2g`, qui reste prioritaire).

4. **Abaisser les seuils**
   - `poor` : < 150 kbps (au lieu de 500)
   - `degraded` : 150 – 600 kbps (au lieu de 500 – 1500)
   - `good` : > 600 kbps
   - Ces seuils correspondent au débit réel nécessaire pour streamer un MP3 ElevenLabs (~ 32 kbps audio + overhead HTTP), avec marge confortable.

5. **Hystérésis simple sur le passage en `poor`**
   - Pour basculer en `poor`, exiger 2 mesures consécutives < 150 kbps. Une seule mesure basse rétrograde au maximum en `degraded`.

Aucune modification côté edge function (`ai-conversation-turn`), côté UI ou côté `InterviewStart`. Le contrat (`tier`, `getForceMaxFollowUps`, `recordTtsTiming`) reste identique.

## Limites assumées

- Sur une vraie connexion pourrie (EDGE, hôtel saturé), le candidat verra les premières relances avant que le système ne dégrade — c'est le prix d'un faux positif rare au lieu de fréquent.
- Pas de test bandwidth dédié au démarrage : on garde la mesure passive via TTS, c'est suffisant pour ce besoin.

## Fichiers touchés

- `src/hooks/useNetworkQuality.ts` (≈ 30 lignes modifiées, aucun ajout de dépendance)

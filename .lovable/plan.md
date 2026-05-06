## Objectif

Afficher une jauge discrète de qualité de connexion sur l'écran candidat, et mettre l'entretien en pause automatique uniquement si le débit devient vraiment trop faible pour que la session fonctionne (TTS qui ne charge plus, transcription bloquée).

## Comportement

### Jauge (toujours visible pendant l'entretien)
- 3 états : `Excellent` (vert / `text-success`), `Moyenne` (orange / `text-warning`), `Faible` (rouge / `text-destructive`)
- Rendu : 3 petites barres verticales type "signal réseau" + libellé court
- Tooltip au survol : débit mesuré (kbps) + type de connexion (`effectiveType`)
- Position : à gauche, juste au‑dessus de "Question X / Y" dans le footer (cf capture jointe)

### Source du signal
Réutilise `useNetworkQuality` (déjà branché dans `InterviewStart`) :
- `tier: "good" | "degraded" | "poor"` → `Excellent | Moyenne | Faible`
- `measuredKbps`, `effectiveType` pour le tooltip

### Pause automatique sur réseau vraiment dégradé
Seuil volontairement strict pour ne pas pénaliser une connexion juste "moyenne" :

Déclencheur : pause uniquement si **les deux** conditions sont vraies pendant **30 s consécutives** :
1. `tier === "poor"` (déjà filtré par le hook : ≥ 2 mesures consécutives < 150 kbps, ou `effectiveType` 2g/slow-2g)
2. `measuredKbps != null && measuredKbps < 80` *(en pratique, en dessous, le TTS ElevenLabs ne charge plus une question avant ~10 s, l'expérience devient cassée)*

Actions à la pause :
- `pauseInterview("auto-network")` (nouvelle source ajoutée à l'union `PauseSource`)
- `setNetworkPauseActive(true)` → overlay centré : « Connexion instable détectée. L'entretien reprendra automatiquement dès que la connexion sera stable. »
- Toast léger
- Pas d'`armEndWarning` (≠ pause silence) : on attend le réseau, pas d'arrêt forcé.

Reprise automatique :
- Dès que `tier !== "poor"` pendant **8 s consécutives** → `resumeInterview()` + masquer l'overlay.
- Si l'utilisateur clique manuellement sur "Reprendre", on respecte son choix et on masque l'overlay.

Garde‑fous :
- Pause auto‑réseau **uniquement** pendant l'écoute candidat : `isListening && !isPaused && !isSpeaking && !isProcessing && !aiThinking`. Jamais pendant un TTS ou une lecture média (sinon on couperait le flux en plein milieu).
- Si l'entretien est déjà en pause (manuelle ou silence), on ne touche à rien.

## Fichiers modifiés

1. **`src/components/interview/NetworkQualityIndicator.tsx`** *(nouveau, ~60 lignes)*
   - Props : `tier`, `measuredKbps`, `effectiveType`
   - 3 barres + libellé, tokens sémantiques (`text-success` / `text-warning` / `text-destructive`)
   - Tooltip shadcn

2. **`src/pages/InterviewStart.tsx`**
   - Insérer `<NetworkQualityIndicator />` au‑dessus de "Question X / Y" (footer, ligne ~3440)
   - Ajouter `"auto-network"` à `PauseSource`
   - Récupérer `measuredKbps` et `effectiveType` du hook (déjà appelé ligne 296)
   - Nouveau state : `networkPauseActive: boolean`
   - `useEffect` "watcher" : démarre/annule un timer 30 s selon les conditions ci‑dessus → déclenche la pause
   - `useEffect` symétrique de reprise (8 s en non‑poor)
   - Overlay simple (pattern de `QuestionLoadingOverlay`) rendu si `networkPauseActive`

3. **`src/hooks/useNetworkQuality.ts`** — aucun changement.

## Détails techniques

```text
poor + kbps<80 ─30s──▶ pauseInterview("auto-network") + overlay
non-poor      ─8s───▶ resumeInterview() + overlay masqué
```

- Timers stockés dans `useRef<number|null>`, nettoyés au démontage et à chaque changement d'état.
- L'overlay réseau a la priorité visuelle sur le hint silence ("Prenez votre temps…" masqué pendant la pause réseau).
- La jauge reflète toujours le tier en temps réel, même hors pause.

## Hors scope
- Pas de ping périodique dédié : on reste sur les mesures passives via TTS, déjà fiables et sans surcoût.
- Pas de modification DB ni d'edge function.

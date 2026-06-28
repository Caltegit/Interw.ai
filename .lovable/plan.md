## Idée directrice
Couper complètement la reconnaissance vocale en direct (`SpeechRecognition`) pendant l'entretien. Toute la détection de présence vocale passe sur une seule mesure RMS (Web Audio). La transcription officielle reste celle générée côté serveur après l'entretien (`transcribe-session`), inchangée.

## Pourquoi ça va régler le ressenti « micro qui coupe »
1. Plus de cycle `recognition.onend → start()` qui perd 100-300 ms d'audio à chaque relance Chrome (~toutes les 30-60 s en `continuous`).
2. Plus de watchdog STT à 15 s qui tue et relance la reconnaissance.
3. Plus de transcription affichée qui se fige : l'utilisateur ne peut plus « voir » une coupure qui n'existait pas dans l'enregistrement.
4. Un seul consommateur audio (le `MediaRecorder`) + un `AnalyserNode` léger → moins de pression CPU sur mobile bas de gamme.
5. La détection de silence devient purement acoustique (RMS), donc fiable même pour les voix douces — on règle un seuil, pas un parseur de mots.

## Ce qu'on perd (et comment compenser)
| Perte | Compensation |
|---|---|
| Sous-titre live « ce que vous dites » | À retirer de l'UI ; pas de remplacement (de toute façon souvent imprécis, source de stress candidat). |
| Détection de silence basée sur l'absence de mots transcrits | Détection RMS dans `useMicHealthWatcher` (déjà en place) + nouveau palier « voix faible ». |
| Auto-relance STT après reprise mobile | Plus nécessaire — le `MediaRecorder` ne dépend pas du gesture iOS. |
| `liveTranscript` envoyé au backend pendant la session | Inutile : la transcription serveur post-session reste la source de vérité. |

## Plan d'implémentation

### Étape 1 — Couper la STT côté candidat
Dans `src/pages/InterviewStart.tsx` :
- Vider `startListening` / `stopListening` (les laisser comme no-ops ou les remplacer par un `setIsListening(true/false)` purement d'état logique).
- Supprimer toutes les références à `recognitionRef`, `sttWatchdogRef`, `lastSttResultAtRef`, `candidateTranscriptRef`, `liveTranscript`, `setLiveTranscript`.
- Supprimer l'écran/élément qui affiche le `liveTranscript` (sous-titre temps réel).
- Garder `isListening` comme état logique (= « phase d'écoute candidat en cours ») piloté par le flux de question, plus par la STT.

### Étape 2 — Contraintes audio explicites (déjà dans le plan précédent, on garde)
Dans les 3 `getUserMedia` (l.1567, 1605, 1665) + `InterviewDeviceTest.tsx` :
```ts
audio: {
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  echoCancellation: true,
  noiseSuppression: false,   // cause principale des trous sur voix douces
  autoGainControl: true,
  channelCount: 1,
}
```
Centraliser dans `src/lib/micLevel.ts` (`DEFAULT_AUDIO_CONSTRAINTS`).

### Étape 3 — Détection de silence 100 % RMS
Dans `src/hooks/useMicHealthWatcher.ts` :
- Retirer le paramètre `liveTranscript` et tout le `useEffect` associé.
- Baisser `rmsSilenceMax` de 0,015 à 0,008.
- Ajouter un nouveau status `"weak"` : signal présent mais < 0,02 RMS moyen sur 5 s → bannière informative non bloquante.
- Garder `silent` (silence total > seuil prolongé) et `track-dead` (track ended).

### Étape 4 — Paliers de silence assouplis
Dans `InterviewStart.tsx` (l.504-508) :
- `SILENCE_HINT_MS` : 6 s → 8 s
- `SILENCE_TIER3_MS` : 12 s → 18 s
- `SILENCE_AUTOPAUSE_MS` : 20 s → 30 s
- Avant d'auto-pauser, vérifier `micHealth.peak` moyen sur 5 s : si > 0,008 le candidat émet du son → ne pas pauser, afficher seulement « Parlez un peu plus fort ».

### Étape 5 — Bannière « voix faible »
Étendre `src/components/interview/MicFailureBanner.tsx` :
- Variante `weak` (ton neutre, non bloquante) : « On vous entend faiblement. Rapprochez-vous du micro ou changez de périphérique. » + bouton « Changer de micro » (réutilise `switchAudioDevice`).
- Garder les variantes `silent` (pause auto imminente) et `track-dead` (réacquisition).

### Étape 6 — Nettoyage backend léger (optionnel mais propre)
- Si `session_messages` recevait jusqu'ici un champ avec la transcription live côté candidat, le laisser vide. Le `transcribe-session` post-entretien remplit la transcription finale comme avant.
- Vérifier qu'aucune logique IA en cours n'utilise `live_transcript` (à confirmer par recherche `rg "liveTranscript|live_transcript"` avant de couper).

### Étape 7 — Télémétrie
Ajouter dans les logs `interview_silence_pause_shown` :
- `rmsPeak5s` (pic des 5 dernières secondes)
- `audioSettings` (sortie de `track.getSettings()`)
Permet de vérifier après mise en prod qu'on n'auto-pause plus que de vrais silences.

## Détails techniques

| Fichier | Changement |
|---|---|
| `src/pages/InterviewStart.tsx` | Supprime tout le bloc STT (l.1115-1267 environ), assouplit silences, plug `useMicHealthWatcher` sans `liveTranscript`, retire l'UI sous-titre live |
| `src/hooks/useMicHealthWatcher.ts` | Retire `liveTranscript`, ajoute status `weak`, baisse seuil |
| `src/lib/micLevel.ts` | + `DEFAULT_AUDIO_CONSTRAINTS` |
| `src/pages/InterviewDeviceTest.tsx` | Mêmes contraintes audio + retrait des tests STT si présents |
| `src/components/interview/MicFailureBanner.tsx` | Variante `weak` |

Aucune migration BDD, aucune fonction edge à toucher. Réversible (on peut rebrancher la STT plus tard si besoin).

## Gains attendus
- Disparition du ressenti « ça coupe » sur 80-90 % des profils touchés.
- Charge CPU candidat ↓ (mobile bas de gamme).
- Code candidat ~300 lignes plus court, beaucoup moins de cas limites.
- Pas d'effet de bord sur le rapport : la transcription finale reste serveur.

## Hors-scope
- Réactiver une STT live conditionnelle (ex. uniquement pour live coaching côté RH) → à reproposer plus tard si besoin produit.
- Couper aussi la STT côté écran de test technique (`InterviewDeviceTest`) — à voir ; aujourd'hui elle sert à valider que le navigateur supporte la voix, plus à grand-chose si on ne l'utilise plus.

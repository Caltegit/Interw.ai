

## Cadence de relance plus rapide + auto-pause + auto-arrêt

### Aujourd'hui

Quand le candidat ne dit rien après une question :
- **8 s** : indice texte « Prenez votre temps… »
- **15 s** : l'IA dit une phrase d'encouragement (« Voulez-vous que je reformule ? »)
- **30 s** : on met en avant le bouton « Passer la question »
- **90 s** : fin automatique de la session, sans prévenir le candidat

C'est trop mou : la première relance vocale arrive à 15 s alors qu'un silence gênant se ressent dès 5 s.

### Nouvelle cadence proposée

| Délai cumulé | Action |
|---|---|
| **5 s** | Indice discret à l'écran : « Je vous écoute… » (pas de voix, juste visuel) |
| **8 s** | **1ʳᵉ relance vocale** courte : « Prenez votre temps, je vous écoute. » |
| **13 s** (5 s après la 1ʳᵉ) | **2ᵉ relance vocale** : « Souhaitez-vous que je reformule la question ? » |
| **18 s** (5 s après) | **3ᵉ relance vocale** : « Un exemple concret peut aider, n'hésitez pas. » |
| **25 s** | **Mise en pause automatique** de la session (même comportement que le bouton Pause). Toast : « Session mise en pause — reprenez quand vous êtes prêt. » L'IA dit aussi « Je mets l'entretien en pause, reprenez quand vous voulez. » |
| **+ 30 s sans reprise** (depuis la pause) | **Avertissement vocal de fin** : « Il semblerait que vous ne soyez plus là. Je vais arrêter cette session dans quelques secondes. » + compte à rebours 10 s visible à l'écran |
| **+ 10 s** | **Arrêt forcé** de la session (même flux que le bouton « Arrêter ») |

Au moindre signe de vie (parole détectée par STT, clic, frappe clavier, sortie de pause manuelle), tous les compteurs sont remis à zéro.

### Détails techniques

Tout se passe dans `src/pages/InterviewStart.tsx`, dans le bloc déjà existant qui gère le silence (`resetSilenceTimer`, `clearSilenceTier`, constantes `SILENCE_*_MS`).

1. **Constantes** : remplacer les valeurs actuelles par
   ```
   SILENCE_HINT_MS = 5_000
   SILENCE_NUDGE_1_MS = 8_000
   SILENCE_NUDGE_2_MS = 13_000
   SILENCE_NUDGE_3_MS = 18_000
   SILENCE_AUTOPAUSE_MS = 25_000
   SILENCE_END_WARNING_MS = 55_000   // = autopause + 30 s
   SILENCE_TIMEOUT_MS = 65_000       // = warning + 10 s
   ```

2. **Refs et timers** : ajouter trois timers (`silenceNudge2TimerRef`, `silenceNudge3TimerRef`, `silenceAutoPauseTimerRef`, `silenceEndWarningTimerRef`) et nettoyer dans `clearSilenceTier`.

3. **Anti-spam vocal** : remplacer le booléen `nudgeAlreadyPlayedRef` par trois booléens (`nudge1Played`, `nudge2Played`, `nudge3Played`) ou un compteur, pour ne pas répéter une relance déjà jouée si le timer est rappelé.

4. **Garde-fous existants à conserver** :
   - Ne rien faire si `isPausedRef.current` (sauf le timer warning/end qui démarre justement quand on est en pause auto).
   - Ne pas parler par-dessus une lecture TTS en cours (existe déjà dans `speakRef`).
   - Ne pas déclencher si `autoEndTriggeredRef.current` est vrai.

5. **Auto-pause** : appeler la même fonction que le bouton « Mettre en pause » (à repérer dans le fichier — probablement `setIsPaused(true)` + flag ref). Marquer un nouveau ref `autoPausedRef = true` pour distinguer de la pause manuelle, et armer le warning + arrêt depuis ce moment-là.

6. **Avertissement de fin** : nouveau state `endCountdown: number | null` affiché en gros à l'écran (overlay sur la carte d'entretien) avec un compte à rebours 10 → 0. Lecture vocale unique de la phrase d'avertissement via `speakRef.current`.

7. **Reprise manuelle** = annulation : si le candidat clique sur « Reprendre » pendant la pause auto, on annule warning + arrêt et on relance le cycle silence normal.

8. **Arrêt forcé** : appeler `endInterviewRef.current?.()` (déjà utilisé par le timeout 90 s actuel) avec un toast clair « Session terminée — aucune activité détectée ».

### Fichier touché

- `src/pages/InterviewStart.tsx` (uniquement la zone des constantes, refs, `clearSilenceTier`, `resetSilenceTimer`, plus un petit overlay JSX pour le compte à rebours).

### Hors champ

- Réglages personnalisables par projet (on garde des constantes en dur — ajustables plus tard si besoin).
- Détection acoustique fine côté micro pour distinguer « silence total » vs « bruit de fond » : on s'appuie sur les résultats STT comme aujourd'hui.


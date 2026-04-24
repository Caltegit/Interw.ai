# Fiabiliser la lecture audio des questions sur mobile

## Diagnostic

Sur iOS Safari (et certains navigateurs Android), un `audio.play()` n'est autorisé que :
1. Dans la même pile synchrone qu'un geste utilisateur, **OU**
2. Sur une instance `HTMLAudioElement` déjà « débloquée » par un geste utilisateur antérieur.

Aujourd'hui, chaque TTS et chaque média de question crée un **nouveau** `new Audio()` → iOS revoit chaque instance comme non débloquée → silence sans erreur.

Le warm-up actuel ne sert à rien car il joue puis jette son instance.

## Action 1 — Instance Audio unique réutilisée (le fix critique)

### `src/pages/InterviewStart.tsx`

- Ajouter `const primaryAudioRef = useRef<HTMLAudioElement | null>(null)`.
- Dans le handler synchrone du clic « Démarrer la session » (avant tout `await`) :
  - Créer `const audio = new Audio()`.
  - Définir `audio.playsInline = true`, `audio.preload = "auto"`.
  - Lui donner une source data-URI ultra-courte silencieuse.
  - Appeler `audio.play().catch(() => {})` puis `audio.pause()` immédiatement (toujours dans la pile synchrone du tap).
  - Stocker dans `primaryAudioRef.current = audio`.
- Refactorer `tryElevenLabs(text)` : au lieu de `new Audio(blobUrl)`, faire :
  ```ts
  const a = primaryAudioRef.current!;
  a.src = blobUrl;
  a.load();
  await a.play();
  ```
- Refactorer `playMediaUrl(url)` (audio des questions pré-enregistrées) de la même façon.
- Retarder `URL.revokeObjectURL` (par ex. dans le `onended` ou avec un délai) pour éviter de couper la lecture en cours.
- Nettoyer `primaryAudioRef.current` au démontage (pause + src vide).

### Impact attendu
Une fois l'instance débloquée par le tap initial, **tous** les TTS et médias de la session passent sans intervention.

## Action 2 — Watchdog audio + overlay de déblocage manuel

### `src/components/interview/AudioUnlockOverlay.tsx` (nouveau)

Composant plein écran (z-index élevé, au-dessus de tout) :
- Titre : « Activer le son »
- Texte court : « Touchez le bouton pour activer la lecture audio. »
- Gros bouton tactile « 🔊 Activer le son » (min-h 56 px).
- Props : `onUnlock: () => void`.
- Style cohérent avec `InterviewBootProgress` (même fond blur + couleurs candidate).

### `src/pages/InterviewStart.tsx`

- Ajouter état `audioBlocked: boolean` et ref `pendingReplayRef = useRef<(() => Promise<void>) | null>(null)`.
- Dans `tryElevenLabs` et `playMediaUrl`, après le `play()` :
  - Lancer un timer 2 s.
  - Si `audio.paused === true` ou `audio.currentTime === 0` à l'expiration → `pendingReplayRef.current = () => a.play()` puis `setAudioBlocked(true)`.
  - Si la lecture démarre normalement (`onplaying`), annuler le timer.
- Afficher `<AudioUnlockOverlay onUnlock={handleUnlock} />` quand `audioBlocked === true`.
- `handleUnlock` :
  - Appelle `pendingReplayRef.current?.()` (geste utilisateur frais → iOS autorise).
  - Met `audioBlocked` à `false`.

### Impact attendu
Filet de sécurité pour les rares cas où Action 1 ne suffirait pas (mode économie d'énergie iOS, autoplay restreint plus strict, etc.). N'apparaît jamais en cas normal.

## Hors scope
- Pas de changement de schéma DB.
- Pas de changement du flux de pause/reprise existant.
- L'écran « Tester mon son » reste optionnel (Action 3 en réserve si jamais 1+2 ne suffisent pas).

## Fichiers modifiés / créés
- ✏️ `src/pages/InterviewStart.tsx` (refactor TTS + média + watchdog)
- ➕ `src/components/interview/AudioUnlockOverlay.tsx` (nouveau)

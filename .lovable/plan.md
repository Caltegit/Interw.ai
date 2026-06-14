# Autoplay vidéo des questions sur mobile

## Constat

Sur mobile (iOS Safari + Android Chrome), quand une question est une vidéo, le candidat doit appuyer sur « Lire la question » au lieu d'une lecture automatique.

Cause : `video.play()` est appelé via `useEffect` après plusieurs étapes asynchrones (TTS de transition, attente `canplaythrough`). Le « jeton de geste utilisateur » du clic initial est consommé / expiré bien avant, donc le navigateur rejette `play()` avec son. Le composant bascule alors sur `needsManualPlay` → bouton « Lire la question ».

## Plan

Débloquer la balise `<video>` pendant un geste utilisateur récent, pour que les `play()` ultérieurs (déclenchés par le code après TTS) soient autorisés.

### 1. Pré-déverrouiller la vidéo au clic « Commencer la session »

Dans `src/pages/InterviewStart.tsx` (handler du bouton « Commencer la session » / au moment où l'overlay de démarrage est validé) :

- Récupérer l'élément `<video>` du `featuredPlayerRef` (ajouter une méthode `unlock()` à `QuestionMediaPlayerHandle`).
- Dans `unlock()` (côté `QuestionMediaPlayer.tsx`) : appeler `el.play()` puis `el.pause()` immédiatement, en muet temporaire si nécessaire, pour « consommer » le geste et marquer cet élément comme autorisé à jouer du son ensuite.
- Faire de même pour l'élément `<audio>` (questions audio).

Cela respecte la règle iOS : un `play()` synchrone dans le handler du clic suffit à autoriser tous les `play()` ultérieurs sur ce même élément.

### 2. Re-déverrouiller à chaque changement de question

Le même élément vidéo est réutilisé d'une question à l'autre (même ref), donc l'autorisation persiste — pas besoin d'action additionnelle entre questions.

### 3. Fallback inchangé

Si malgré tout `play()` est rejeté (cas extrême), on garde le bouton « Lire la question » actuel comme filet de sécurité.

## Détails techniques

- `QuestionMediaPlayer.tsx` :
  - Ajouter `unlock: () => void` à `QuestionMediaPlayerHandle`.
  - Implémentation : `el.muted = true; el.play().then(() => { el.pause(); el.currentTime = 0; el.muted = false; }).catch(() => {})`.
- `InterviewStart.tsx` :
  - Appeler `featuredPlayerRef.current?.unlock()` à l'intérieur du handler `onClick` qui démarre la session (le geste utilisateur), avant tout `await`.

## Hors scope

- Pas de modification du backend, du schéma, ni de la logique de TTS.
- Pas de changement sur la variante `inline` (vignettes dans l'historique) — autoplay reste manuel comme aujourd'hui.

## Vérification

1. iPhone Safari + Android Chrome : passer une session avec une question vidéo → la vidéo doit démarrer seule après la transition TTS, sans afficher « Lire la question ».
2. Desktop : comportement inchangé.
3. Si le geste a expiré pour une raison réseau : le bouton « Lire la question » s'affiche toujours en filet de sécurité.

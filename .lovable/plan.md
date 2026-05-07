## Problème

Sur la lecture vidéo du rapport, la barre de progression ne permet pas d'avancer librement au milieu de la vidéo.

C'est un problème connu avec les vidéos WebM enregistrées via `MediaRecorder` (cas des réponses candidat) : le fichier ne contient pas la durée dans son header, donc le navigateur signale `duration = Infinity` et désactive le seek (clic sur la barre sans effet).

## Correctif

Modifier `src/components/session/SessionVideoNavigator.tsx` pour « réparer » la durée à la volée :

1. Au `loadedmetadata`, si `video.duration === Infinity` :
   - Forcer `currentTime = 1e9` (très grande valeur)
   - Au prochain événement `timeupdate`, lire la vraie durée, la stocker, puis remettre `currentTime = 0`
2. Stocker cette durée dans l'état pour l'affichage `x.xxmin` (déjà présent).
3. Une fois la durée connue, la barre native HTML5 redevient cliquable et le seek fonctionne.

Aucun changement visuel, juste la barre de progression qui devient pleinement utilisable.

## Détails techniques

```ts
const fixDuration = () => {
  const v = videoRef.current!;
  if (v.duration === Infinity) {
    const onTime = () => {
      v.removeEventListener("timeupdate", onTime);
      const real = v.duration;
      v.currentTime = 0;
      if (Number.isFinite(real)) setDurationSec(real);
    };
    v.addEventListener("timeupdate", onTime);
    v.currentTime = 1e9;
  } else if (Number.isFinite(v.duration)) {
    setDurationSec(v.duration);
  }
};
```

Appliqué dans le `useEffect` de changement de clip et dans `onLoadedMetadata`.

Fichier modifié : `src/components/session/SessionVideoNavigator.tsx`

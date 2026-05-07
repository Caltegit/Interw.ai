## Correctif barre de défilement vidéo (vue Tableau)

Fichier : `src/components/project/SessionCard.tsx`

Même bug que dans le rapport : les segments vidéo enregistrés via MediaRecorder (WebM) ont `duration = Infinity`, ce qui empêche le navigateur de calculer la timeline et bloque le déplacement du curseur.

### Correctif (identique à `SessionVideoNavigator`)

1. Ajouter une fonction `fixDuration()` qui :
   - détecte `v.duration === Infinity`
   - effectue un seek `v.currentTime = 1e9` pour forcer la lecture de tout le flux
   - écoute `timeupdate` une fois, puis remet `currentTime = 0` et capture la vraie durée
2. Appeler `fixDuration()` :
   - depuis le `useEffect` de changement de clip (avant l'autoplay)
   - depuis `onLoadedMetadata` sur le `<video>` si `duration` n'est pas finie
3. Conserver l'autoplay : ne déclencher `v.play()` qu'après la réparation de la durée.

Aucun changement visuel : seul le curseur de la barre native devient utilisable (avance / recul possibles).

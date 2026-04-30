## Objectifs

1. **Le retour vidéo mobile ne s'affiche pas** : `streamRef.current` est assigné une seule fois (au démarrage) à `videoRef.current`. Quand le `<video>` mobile se monte plus tard (changement de question, rerender conditionnel), son `srcObject` reste vide → écran noir.
2. **Aligner la miniature vidéo mobile sur la même ligne que le bouton « Passer la question »**, vidéo à gauche, bouton à droite.

## Modifications dans `src/pages/InterviewStart.tsx`

### 1. Réassigner `srcObject` à chaque montage du `<video>`

Utiliser un **ref callback** sur l'élément vidéo au lieu d'un ref statique, pour réassigner `streamRef.current` dès que le `<video>` est monté ou remonté :

```tsx
const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
  videoRef.current = el;
  if (el && streamRef.current && el.srcObject !== streamRef.current) {
    el.srcObject = streamRef.current;
    el.play().catch(() => { /* ignore autoplay rejection */ });
  }
}, []);
```

Remplacer `ref={videoRef}` par `ref={setVideoEl}` sur les deux `<video>` (mobile et desktop).

Ajouter `autoPlay` sur le `<video>` mobile (par sécurité avec `muted` + `playsInline`, autorisé par tous les navigateurs mobiles).

### 2. Repositionner la miniature mobile

Supprimer le bloc autonome (lignes 2821-2841) et l'intégrer **dans la même rangée que le bouton « Passer la question »** :

```tsx
<div className="flex items-center justify-between gap-3 lg:justify-end">
  {/* Vidéo mobile à gauche */}
  <div className="lg:hidden relative rounded-lg overflow-hidden bg-black border border-emerald-500/40 shadow-md w-[96px] h-[68px] shrink-0">
    <video ref={setVideoEl} muted playsInline autoPlay
           className="w-full h-full object-cover"
           style={{ transform: "scaleX(-1)" }}
           data-testid="interview-self-video-mobile" />
    <div className="absolute top-0.5 right-0.5 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-1 py-0.5 rounded text-[9px] font-semibold">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" />
    </div>
  </div>
  {/* Bouton "Passer la question" à droite (inchangé) */}
  {silenceTier >= 3 ? (...) : (...)}
</div>
```

Sur desktop : `lg:justify-end` conserve le bouton seul à droite (la vidéo mobile est `lg:hidden`).

### 3. Vérifier que `startVideoStream` se déclenche bien

Le flux est lancé ligne 1474. Si l'élément `<video>` n'existait pas encore au moment de l'appel, le ref callback s'occupera de réattacher `srcObject` quand il se montera. Aucun changement nécessaire dans `startVideoStream`.

## Détails techniques

- Le ref callback est appelé à chaque montage/démontage du DOM, ce qui couvre les remontages dus aux changements de question ou d'état.
- `autoPlay + muted + playsInline` est requis pour l'autoplay sur iOS Safari.
- Les deux `<video>` (mobile dans la colonne droite, desktop dans le footer) utilisent le même ref callback — un seul est monté à la fois (responsive), donc pas de conflit.

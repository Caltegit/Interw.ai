## Problème

Sur le rapport candidat, la vidéo passe d'inline (dans `DecisionBanner`) à épinglée en haut à droite via un `IntersectionObserver` qui observe un sentinel placé juste sous `DecisionBanner` (`SessionReportView.tsx` ligne 254-270).

Quand la page est courte :
1. On scrolle → sentinel sort → `isPinned = true` → la vidéo quitte `videoSlot` et le `DecisionBanner` se contracte (le slot vidéo disparaît) → la hauteur de la page diminue → le sentinel remonte et revient dans le viewport → `isPinned = false` → la vidéo réintègre `videoSlot`, la page rallonge → boucle infinie = tremblement.

La cause racine est la **reflow du layout** déclenchée par le pin lui-même, pas le seuil.

## Correction

Deux ajustements complémentaires dans `src/components/session/SessionReportView.tsx` :

### 1. Réserver l'espace du slot vidéo quand la vidéo est épinglée

Le `videoSlot` passé à `DecisionBanner` (ligne 377) doit toujours occuper la même place. Au lieu de :
```tsx
videoSlot={sessionClips.length > 0 ? <div ref={setInlineHost} className="h-full" /> : undefined}
```
garder le slot monté en permanence et masquer visuellement son contenu quand `isPinned` (en gardant les mêmes dimensions via `visibility: hidden` ou un placeholder de même ratio). Le portail React `portalHost` continue de basculer vers `pinnedHost` ; le `inlineHost` reste dans le DOM avec sa hauteur réservée, donc le layout ne bouge plus.

### 2. Hystérésis sur le seuil d'épinglage (ceinture + bretelles)

Remplacer le `IntersectionObserver` mono-seuil par une logique avec deux seuils :
- pin quand `sentinel.top < -16px`
- unpin quand `sentinel.top > 16px`

Implémentation : conserver `IntersectionObserver` mais avec deux observers (un avec `rootMargin: "16px 0px 0px 0px"` pour le pin, l'autre avec `rootMargin: "-16px 0px 0px 0px"` pour l'unpin), ou plus simple : un `scroll` listener léger qui lit `sentinelEl.getBoundingClientRect().top` et applique l'hystérésis. La zone morte de 32px absorbe tout micro-jitter résiduel.

## Fichier modifié

- `src/components/session/SessionReportView.tsx` (lignes 254-270 et 377)

## Hors périmètre

- Pas de changement visuel de la vidéo épinglée ni de son emplacement.
- Pas de changement sur `DecisionBanner` lui-même (le slot existe déjà, on l'utilise juste différemment).

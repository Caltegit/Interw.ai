## Comportement

Au scroll, dès que le cartouche décision sort du viewport :
- Apparition d'une barre fixe en haut, contenant :
  - À gauche : badge Reco IA + Prénom Nom + badge statut/décision
  - À droite : mini-vidéo (~30 %) avec play/pause natif et les boutons Préc / Q n / Suiv en dessous
- Juste sous cette barre : la liste des onglets devient sticky
- Quand l'utilisateur remonte, la vidéo retrouve sa place dans le cartouche, la barre et les onglets sticky disparaissent
- La lecture vidéo n'est jamais interrompue lors du basculement

```text
┌──────────────────────────────────────────────┐
│ [Reco] Prénom Nom  [Statut]      ┌────────┐ │  ← barre fixe
│                                  │ vidéo  │ │     (info à gauche,
│                                  │ Préc Q │ │      mini-vidéo à droite)
│                                  │ Suiv   │ │
│                                  └────────┘ │
│ [Reco][BigFive][Orale][Att.][Trans.]        │  ← onglets sticky
├──────────────────────────────────────────────┤
│   contenu de l'onglet (scroll)               │
```

## Détails techniques

- `SessionVideoNavigator.tsx` : ajout des props `portalTarget?: HTMLElement | null` et `compact?: boolean`. Le composant crée un conteneur DOM stable (créé une seule fois) et l'attache au `portalTarget` via `appendChild` dans un `useLayoutEffect`. Tout le rendu React passe par `createPortal` vers ce conteneur stable, ce qui garantit que l'élément `<video>` n'est jamais démonté lorsqu'on bascule entre la position normale et la mini-barre — la lecture continue sans coupure.
- En mode `compact` : padding réduit, masquage des boutons de vitesse (2×/1,5×/1×) et des sauts ±10 s, conservation du sélecteur Q n et des boutons Préc / Suiv.
- `DecisionBanner.tsx` : `recoConfig` et `decisionConfig` exportés pour réutilisation dans la barre fixe.
- `SessionDetail.tsx` :
  - États `inlineHost`, `pinnedHost`, `isPinned`. `IntersectionObserver` sur un sentinel placé sous le `DecisionBanner` pour basculer `isPinned`.
  - `SessionVideoNavigator` rendu une seule fois comme frère stable dans l'arbre (et non plus en tant que `videoSlot`), avec `portalTarget = isPinned ? pinnedHost : inlineHost`.
  - `videoSlot` du `DecisionBanner` devient un simple `<div ref={setInlineHost}/>` qui sert d'ancre au portail.
  - Quand `isPinned` est vrai : rendu d'un `<div className="fixed inset-x-0 top-0 z-40 …">` contenant le bloc info à gauche et le `<div ref={setPinnedHost}/>` à droite (largeur ≈ 180 px).
  - La `TabsList` est sticky uniquement quand `isPinned` est vrai (`sticky top-[148px] z-30 bg-background`), pour rester juste sous la barre fixe.
- Aucune modification métier, ni d'API, ni de la logique de lecture/synchronisation existante.

## Vérification

- Compilation TypeScript sans erreur.
- Vérification manuelle dans la preview : scroll de haut en bas, scroll inverse, changement d'onglet pendant la lecture, navigation Préc/Suiv depuis la mini-vidéo.

## Objectif

Sur mobile (côté session candidat), le retour vidéo se trouve actuellement dans le pied de page sous les actions. Le déplacer **entre l'avatar IA (en haut) et le bloc question (en dessous)**, aligné à gauche, et supprimer toutes les actions (pas de bouton masquer/afficher, pas de bouton couper le son ou la vidéo). Le comportement desktop reste inchangé.

## Modifications

Fichier : `src/pages/InterviewStart.tsx`

### 1. Ajouter un bloc retour vidéo mobile-only entre l'avatar et la question

Insérer, juste avant la colonne question (ligne 2821, `<div className="lg:col-span-1 ...">`), un nouveau bloc visible uniquement sur mobile (`lg:hidden`) :

```tsx
{/* Retour vidéo candidat — mobile uniquement, entre avatar et question, aligné à gauche, sans actions */}
{!interviewFinished && (
  <div className="lg:hidden flex justify-start -mt-2">
    <div className="relative rounded-lg overflow-hidden bg-black border border-emerald-500/40 shadow-md w-[96px] h-[68px]">
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        data-testid="interview-self-video-mobile"
      />
      <div
        className="absolute top-0.5 right-0.5 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-1 py-0.5 rounded text-[9px] font-semibold"
        data-testid="interview-recording-indicator-mobile"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" />
      </div>
    </div>
  </div>
)}
```

Important : `videoRef` est déjà attaché à un seul élément `<video>` à la fois. Comme on déplace l'usage sur mobile, il faut s'assurer qu'**un seul `<video ref={videoRef}>` est monté** selon le breakpoint. On gère ça via le rendu conditionnel ci-dessous.

### 2. Masquer le retour vidéo du pied de page sur mobile

Dans le footer (lignes 3113-3157), envelopper le bloc « Retour vidéo » dans un wrapper `hidden lg:flex` au lieu de `flex justify-center sm:justify-end` afin que sur mobile :
- aucun élément vidéo n'y soit monté (évite le double `videoRef`),
- aucune action (œil, masquer, afficher) ne soit visible.

```tsx
{/* Retour vidéo : caché sur mobile (rendu plus haut), visible desktop */}
<div className="hidden lg:flex lg:justify-end items-center">
  {showSelfView ? ( ... ) : ( ... )}
</div>
```

Et simplifier le conteneur parent ligne 3080 : sur mobile il n'y a plus que les actions, donc :

```tsx
<div className="flex flex-col items-center gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
  <div className="hidden lg:block" />
  <div className="flex items-center gap-2 justify-center"> {/* actions inchangées */} </div>
  <div className="hidden lg:flex lg:justify-end items-center"> {/* retour vidéo desktop */} </div>
</div>
```

### 3. Conserver le flux vidéo actif sur mobile

Le bloc mobile rend toujours `<video ref={videoRef}>` (pas de toggle `showSelfView`), donc le flux reste actif. L'état `showSelfView` continue de piloter l'affichage desktop uniquement.

## Détails techniques

- Breakpoint : on bascule au breakpoint `lg` (≥1024px) pour rester cohérent avec la grille principale `lg:grid-cols-3` du contenu.
- Taille mobile : `96×68 px`, suffisamment visible mais discret, aligné à gauche via `justify-start`.
- Aucune action sur le bloc mobile : pas de `<button>`, pas de toggle son, juste l'indicateur REC (pastille rouge animée sans texte « REC » — superflu sur si petit format).
- Marge négative `-mt-2` pour serrer la vidéo contre l'avatar et bien marquer qu'elle se place entre avatar et question.
- Un seul `<video ref={videoRef}>` monté à la fois (mobile OU desktop), pour éviter les conflits sur `MediaStream`.

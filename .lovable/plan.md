## Objectif

Déplacer le lecteur vidéo (actuellement dans la colonne droite) en haut à droite du bloc d'en-tête (NOM + score + décisions), et figer cet ensemble en haut de l'écran lors du scroll.

## Schéma visuel

### Avant

```text
┌─────────────────────────────────────────────────────────────┐
│  [SCORE]  NOM CANDIDAT              [Non][Discuter][Oui]    │ ← sticky
│   Reco    email · poste · 23 min                            │
└─────────────────────────────────────────────────────────────┘
┌────────────────────────────────────┐ ┌──────────────────────┐
│ [Onglets : Reco IA | Big Five | …] │ │  ┌────────────────┐  │
│                                    │ │  │  VIDEO PLAYER  │  │ ← sticky
│  ┌──────────────────────────────┐  │ │  └────────────────┘  │   (col droite)
│  │  Fit breakdown               │  │ │  Notes recruteur     │
│  │  Signals                     │  │ │  ┌────────────────┐  │
│  │  …                           │  │ │  │                │  │
│  │  (scroll)                    │  │ │  └────────────────┘  │
│  └──────────────────────────────┘  │ │                      │
└────────────────────────────────────┘ └──────────────────────┘
```

### Après

```text
┌──────────────────────────────────────┬──────────────────────┐
│  [SCORE]  NOM CANDIDAT               │  ┌────────────────┐  │
│   Reco    email · poste · 23 min     │  │  VIDEO PLAYER  │  │ ← sticky
│           [Non][Discuter][Oui][...]  │  └────────────────┘  │   (ensemble)
├──────────────────────────────────────┴──────────────────────┤
┌────────────────────────────────────┐ ┌──────────────────────┐
│ [Onglets : Reco IA | Big Five | …] │ │  Notes recruteur     │
│                                    │ │  ┌────────────────┐  │
│  ┌──────────────────────────────┐  │ │  │                │  │
│  │  Fit breakdown               │  │ │  └────────────────┘  │
│  │  Signals                     │  │ │                      │
│  │  …                           │  │ │                      │
│  │  (scroll)                    │  │ │                      │
│  └──────────────────────────────┘  │ │                      │
└────────────────────────────────────┘ └──────────────────────┘
```

Au scroll, la barre du haut (NOM + décisions à gauche, VIDÉO à droite) reste collée en haut. Les onglets et les notes défilent normalement en dessous.

## Modifications

### 1. Nouveau bloc d'en-tête sticky combiné

Dans `src/pages/SessionDetail.tsx`, créer un wrapper `sticky top-0 z-30` contenant deux colonnes alignées sur la même grille que le contenu (`lg:grid-cols-[1fr_510px]`) :
- Gauche : `<DecisionBanner>` (sans son `sticky` propre)
- Droite : `<SessionVideoNavigator>` (déplacé depuis la colonne droite)

### 2. Ajustements `DecisionBanner.tsx`

- Retirer `sticky top-0 z-30` de la `<Card>` racine (la stickyness passe au wrapper parent).
- Garder le reste intact.

### 3. Colonne droite réduite

- Retirer `<SessionVideoNavigator>` de `#session-video-panel`.
- Ne conserver que la carte « Notes recruteur ».
- Retirer `lg:sticky lg:top-4` de cette colonne (le sticky est désormais en haut, plus besoin).

### 4. Hauteur du lecteur vidéo

Limiter la hauteur du `SessionVideoNavigator` dans la zone sticky pour qu'il ne dépasse pas (ex. `max-h-[60vh]` ou hauteur calée sur le banner) afin que l'utilisateur voie toujours le contenu défilant en dessous. À ajuster visuellement après implémentation.

### 5. Cas mobile

Sur mobile (`< lg`), la grille passe en une seule colonne. Le bloc vidéo s'affichera donc sous le banner, comme avant (pas de sticky lourd sur petit écran).

## Vérification

- Scroller la page : NOM + décisions + vidéo restent visibles en haut.
- La sidebar gauche du site et le copilote latéral ne sont pas impactés.
- Sur mobile, pas de chevauchement.
- Responsive 1440px et 1753px (viewports observés).

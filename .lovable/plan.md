

## Adapter l'écran candidat à la hauteur de l'écran (sans scroll) et déplacer le retour vidéo

### Problèmes actuels (sur ordinateur)

1. Le conteneur principal utilise `min-h-[calc(100vh-4rem)]` (hauteur **minimale**), donc le contenu peut déborder verticalement et forcer un scroll.
2. La grille interne a `pb-32 sm:pb-24` (gros padding-bas) qui repousse tout vers le bas et provoque un dépassement.
3. Le footer affiche d'abord la barre d'avancement, puis en dessous le retour vidéo (à droite). Tu veux l'inverse : **le retour vidéo au-dessus de la barre d'avancement**, à droite.
4. L'avatar IA est en `lg:max-h-[70vh]` mais sans contrainte parent stricte, il continue de pousser la page.

### Changements (uniquement sur ordinateur, mobile inchangé)

Fichier touché : `src/pages/InterviewStart.tsx`.

#### 1. Forcer la page à tenir dans la fenêtre

- Remplacer `min-h-[calc(100vh-4rem)]` par `lg:h-[calc(100vh-4rem)] lg:overflow-hidden` sur le conteneur racine de l'entretien. Sur mobile, on garde le comportement actuel (`min-h-screen`, scroll possible).
- La grille centrale passe de `flex-1 ... py-6 sm:py-8 pb-32 sm:pb-24` à `lg:flex-1 lg:min-h-0 lg:py-4 lg:pb-2` pour récupérer l'espace volé par le padding.

#### 2. Contraindre l'avatar IA en hauteur

- L'avatar carré utilisera `lg:h-full lg:w-auto lg:aspect-square lg:max-h-full` à la place du `aspect-square` global, dans une colonne `lg:min-h-0 lg:flex lg:items-center lg:justify-center`. L'image reste centrée et ne pousse plus la page.

#### 3. Réorganiser le footer (retour vidéo au-dessus de la barre)

Le bloc footer (`!interviewFinished && (...)`) est restructuré ainsi sur ordinateur :

```
┌─────────────────────────────────────────────────────────┐
│ [actions centrées : Arrêter / Pause]    [retour vidéo] │  ← ligne 1
├─────────────────────────────────────────────────────────┤
│ Question 3/5    [============progression===]            │  ← ligne 2
└─────────────────────────────────────────────────────────┘
```

- Ligne 1 : la grille `[1fr_auto_1fr]` actuelle (vide / actions centrées / retour vidéo à droite) passe **en premier**.
- Ligne 2 : la barre d'avancement + libellé « Question x / y » + indicateurs IA (« L'IA réfléchit… ») passe **en second**, juste avant la fin.
- Le retour vidéo conserve sa taille actuelle (`80×56` mobile, `100×72` desktop) et son bouton « Afficher / Masquer ma vidéo ».

#### 4. Réduire les paddings verticaux du footer pour libérer de la place

- Footer : `py-3 sm:py-4` → `lg:py-2`, `space-y-2` → `lg:space-y-1.5`.

### Ce qui ne change pas

- Mobile : aucun changement visuel ni structurel (scroll conservé si nécessaire).
- Toute la logique d'entretien (questions, IA, enregistrement, transcription, raccourcis clavier, plein écran).
- Les composants `MicVolumeMeter`, `QuestionMediaPlayer`, `FullscreenPrompt`.
- La page de fin d'entretien (`interviewFinished`) garde son CTA et son layout.
- Aucun changement BDD, aucune nouvelle dépendance.

### Hors champ

- Page `InterviewDeviceTest` (test caméra/micro avant entretien) : non concernée.
- Adaptation pour très petites hauteurs ordinateur (< 600 px) : si l'avatar devait encore être trop grand, on pourra l'ajuster dans une seconde itération.


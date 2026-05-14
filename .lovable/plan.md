## Objectif

Rendre la largeur du panneau latéral Copilote IA adaptative selon la taille de l'écran, plutôt que figée à 420 px.

## Constat

Aujourd'hui, dans `src/components/copilot/CopilotSidePanel.tsx`, la largeur est codée en dur :
- Caché en dessous de `md` (mobile → drawer plein écran, déjà bon).
- `w-[420px]` à partir de `md` (≥ 768 px), que l'écran fasse 800 px ou 2560 px.

Conséquences :
- Sur petit laptop (1280–1440 px), 420 px mange une grande part de la zone de travail.
- Sur grand écran (≥ 1920 px), le panneau paraît étriqué alors qu'on a la place pour respirer et mieux lire les réponses IA.

## Proposition

Largeur fluide par paliers, bornée par un min et un max, avec une part proportionnelle de la fenêtre au milieu :

```text
écran < 768 px        → drawer plein écran (inchangé)
768 – 1279 px         → 360 px           (laptop compact, on préserve l'espace de travail)
1280 – 1535 px        → 400 px
1536 – 1919 px        → 30 vw  (≈ 460–575 px)
≥ 1920 px             → 33 vw, plafonné à 640 px
```

Implémentation Tailwind, une seule classe responsive :

```tsx
open
  ? "w-[360px] xl:w-[400px] 2xl:w-[30vw] min-[1920px]:w-[33vw] min-[1920px]:max-w-[640px]"
  : "w-0"
```

Bornes :
- `min-w-[320px]` de sécurité pour ne jamais descendre trop bas si on ajoute des breakpoints.
- `max-w-[640px]` pour éviter qu'un ultra-wide ne donne un panneau démesuré.

## Pourquoi c'est « intelligent »

- **Pas de JS** : 100 % CSS via Tailwind, zéro coût runtime, pas de listener resize.
- **Respecte les breakpoints existants** du design system (`md`, `xl`, `2xl`).
- **Proportionnel sur grand écran** (`vw`) → le panneau grandit naturellement avec la fenêtre.
- **Borné** → jamais trop petit, jamais trop large, lecture confortable des messages IA.
- **Mobile inchangé** : le drawer reste plein écran, déjà optimal.

## Fichier modifié

- `src/components/copilot/CopilotSidePanel.tsx` : remplacer la classe `w-[420px]` par la classe responsive ci-dessus, ajouter `min-w-0` sur le conteneur si besoin pour éviter tout débordement.

## Hors périmètre

- Pas de poignée de redimensionnement manuel (possible plus tard avec `react-resizable-panels` déjà présent, mais ajoute de la complexité et un état à persister — à valider séparément si tu le souhaites).
- Pas de changement du drawer mobile.
- Pas de modification du contenu du panneau.

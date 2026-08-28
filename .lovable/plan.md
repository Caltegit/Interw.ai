# Landing — hero, vidéo et section « problème »

## 1. Hero plus net

- Suppression de la ligne « Gratuit · 15 entretiens / mois · sans carte » (clé `hero.freeNote`, FR et EN).
- Les deux boutons passent côte à côte sur une seule ligne, centrés (empilés uniquement sur très petits écrans) :
  - **Demander une démo** — bouton noir plein (inchangé, lien Cal).
  - **Commencer gratuitement** — bouton secondaire blanc à contour noir, même hauteur, vers `/login`.
- Copy alignée sur le nouveau pricing : FR « Commencer gratuitement », EN « Start for free » (remplace « Créer un compte gratuit » / « Create a free account »).

## 2. Vidéo hero plus grande, sans double cadre

Aujourd'hui la vidéo est posée dans un cadre à fond blanc + grille : quand les proportions ne collent pas, on voit un cadre dans le cadre.

- Le cadre épouse exactement la vidéo : on impose le ratio natif (16/9) au conteneur, la vidéo le remplit entièrement (`object-cover` sur le ratio exact), donc plus aucune bande de fond visible. Le décor grille/halo disparaît puisqu'il n'est plus visible.
- La vidéo occupe toute la largeur disponible et gagne en largeur : conteneur élargi (au-delà du `max-w-5xl` du texte, jusqu'à ~1120 px) pour que les captures d'écran soient quasi pleine largeur.
- Toujours visible sans scroll, quelle que soit la taille d'écran : la largeur est bornée par la hauteur restante du viewport (`min()` entre la largeur max et la hauteur disponible × 16/9), calculée à partir de `100dvh` moins le header, le bloc titre/boutons et les marges. Sur mobile, la vidéo passe pleine largeur avec des marges réduites.

## 3. Section « problème »

- Titre remplacé par : « Et si votre prochain recrutement était celui que vous auriez écarté sur CV ? » (EN : « What if your next great hire is the one you'd have filtered out on paper? »).
- Cette phrase servait déjà de titre au bloc de clôture en bas de page : ce bloc reprend l'ancien titre « Aujourd'hui vous ne triez pas des candidats. Vous triez des documents. » pour éviter le doublon.
- Les 4 cartouches perdent leur sous-titre explicatif : il ne reste que le numéro + le titre, puis l'illustration animée (qui remonte, cartes plus compactes et de hauteur égale).
- 4ᵉ cartouche (l'entonnoir en points) : couleurs plus franches — palette saturée et opacités relevées (points « CV reçus » / « Appelés » / « Entretiens » / « Recruté » nettement contrastés au lieu des tons pastel actuels), pour lire l'écrasement du funnel d'un coup d'œil.

## 4. Titre section produit

« Faites-les tous passer, sans y passer vos journées. » → « Donnez une chance à chacun » (EN : « Give everyone a shot »).

## Détails techniques

- Fichiers : `src/pages/Landing.tsx` (hero, boutons, `DemoVideo`, conteneur vidéo), `src/components/landing/FunnelCards.tsx` (suppression des `desc`, opacités/tokens de la carte 4), `src/index.css` (tokens `--l-step-*` plus saturés si nécessaire), `src/i18n/locales/fr/landing.json` et `en/landing.json` (clés `hero.freeNote` supprimée, `hero.createAccount`, `problem.title`, `closing.title`, `product.title`, `funnel.s1..s4.desc` supprimées).
- Aucune logique métier, aucun changement backend, pricing intact.
- Vérification Playwright : captures desktop 1440×900, laptop 1280×720 et mobile 390×844 pour confirmer que la vidéo tient sans scroll et sans double cadre.

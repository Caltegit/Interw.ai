# Corriger le chevauchement vidéo / logos sur la landing

## Constat vérifié
Mesures prises sur la page en 1065×910 :
- la vidéo se termine à 968 px,
- la section « Ils recrutent avec Interw » commence à 911 px.

La vidéo déborde donc de 57 px et recouvre les logos (d'où l'aspect coupé sur la capture).

Cause : le bloc hero + vidéo est enfermé dans un conteneur à hauteur fixe (`md:h-[calc(100dvh-4rem)]`). La vidéo garde son ratio 16:9 sur toute la largeur (max 1120 px), ce qui dépasse la hauteur restante ; elle sort du conteneur et passe par-dessus la section logos qui se trouve à l'extérieur de ce conteneur.

## Correction demandée
- Garder la taille actuelle de la vidéo.
- Sortir la section « Ils recrutent avec Interw » du bloc hero + vidéo pour qu'elle se place naturellement en dessous, dans le flux normal de la page.
- Supprimer le conteneur à hauteur fixe (`md:h-[calc(100dvh-4rem)]`) autour du hero + vidéo afin que rien ne soit tronqué ou superposé.

## Fichier impacté
`src/pages/Landing.tsx` : restructurer le hero + vidéo en un simple flux vertical sans fold fixe, puis placer la section logos juste après.

## Vérification
Captures en desktop (1065×910, 1440×900) et mobile (390×844) pour confirmer que le bas de la vidéo reste au-dessus du haut de la section logos, et que les 4 logos sont entièrement visibles.

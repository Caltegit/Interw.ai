# Corriger le chevauchement vidéo / logos sur la landing

## Constat vérifié
Mesures prises sur la page en 1065×910 :
- la vidéo se termine à 968 px,
- la section « Ils recrutent avec Interw » commence à 911 px.

La vidéo déborde donc de 57 px et recouvre les logos (d'où l'aspect coupé sur la capture).

Cause : le bloc hero + vidéo est enfermé dans un conteneur à hauteur fixe (`md:h-[calc(100dvh-4rem)]`). La vidéo garde son ratio 16:9 sur toute la largeur (max 1120 px), ce qui dépasse la hauteur restante ; rien ne la contraint, elle sort du conteneur et passe par-dessus la section suivante.

## Correction
Dans `src/pages/Landing.tsx` :
1. Retirer la hauteur fixe du fold (`md:h-[calc(100dvh-4rem)]`) ; le hero et la vidéo s'enchaînent alors normalement dans le flux.
2. Contraindre la vidéo pour qu'elle reste raisonnable sans jamais déborder : `min-h-0` sur le conteneur flex et une hauteur max basée sur la fenêtre (`max-h-[min(56vw,60dvh)]` environ) avec conservation du ratio 16:9 et centrage.
3. Vérifier qu'aucune ombre/arrondi ne déborde sur la section logos.

## Vérification
Captures en desktop (1065×910, 1440×900) et mobile (390×844) pour confirmer que le bas de la vidéo reste au-dessus du haut de la section logos, et que les 4 logos sont entièrement visibles.

## Objectif
Côté candidat, pendant l'entretien, réduire la photo du recruteur (avatar IA) et l'afficher en **16/9 façon visio** au lieu d'un grand carré.

## Fichier modifié
- `src/pages/InterviewStart.tsx` (zone d'affichage de l'avatar IA, lignes ~2660-2730)

## Changements

### 1. Conteneur de l'avatar (cas par défaut, sans vidéo de question)
- Ratio : `aspect-square` → **`aspect-video`** (16/9)
- Taille : ajout de **`max-w-[520px]`** desktop, **`max-w-[320px]`** mobile
- Coins : `rounded-3xl` → **`rounded-2xl`**
- Le halo "écoute/parole" et le ring sont conservés, juste adaptés au nouveau ratio

### 2. Image
- `object-contain` → **`object-cover`** centré, pour cadrer proprement le visage dans le 16/9 (pas de bandes noires)
- Le fond `bg-muted/30` reste comme filet de sécurité

### 3. Cas vidéo de question (`currentQ.video_url`)
- `max-w-3xl` → **`max-w-[520px]`** pour rester cohérent avec la nouvelle taille de l'avatar

### 4. Layout colonne gauche
- La colonne reste `lg:col-span-2` mais le contenu est désormais centré dans une fenêtre 520px max au lieu de remplir toute la hauteur
- La colonne droite (question + bouton "Passer") se recentre verticalement automatiquement

### Inchangé
- Badge "Marie — IA" en haut à gauche
- Animations halo + barres de niveau quand l'IA parle
- Logique d'écoute / de relance
- Pas d'ajout de vignette webcam candidat (à voir plus tard si besoin)

## Validation
Après modification, vérifier sur le preview (viewport 714px et desktop) que :
- L'avatar a bien l'allure d'une fenêtre de visio compacte
- La photo du recruteur n'est pas déformée
- Le bouton "Passer la question" reste bien visible à droite

# Remettre la bonne icône partout et nettoyer les logos visibles dans Google

## 1. L'icône d'onglet (favicon)

Aujourd'hui l'icône est le logo horizontal « interw » réduit en tout petit : illisible.
Le favicon officiel fourni (fichier `Favicon_interw-2.svg`, fond crème #F4F3EF, « iw » noir) devient l'icône partout.

- Copier le SVG officiel en `public/favicon.svg` et en tirer des versions PNG 64x64 (navigateurs) et 180x180 (icône d'écran d'accueil iPhone).
- Dans `index.html` : pointer l'icône vers ces fichiers (SVG + repli PNG + icône Apple) et supprimer l'ancien `public/favicon.png` généré à partir du logo horizontal.
- Le logo horizontal reste inchangé dans le bandeau de la landing page (c'est le bon endroit pour lui).

Résultat : même favicon officiel dans l'onglet du navigateur, les favoris et le mobile, sur la landing comme dans l'application — un seul fichier de référence.

## 2. Les anciens logos qui remontent dans les recherches Google

Ce que Google affiche vient de deux sources :

- L'image de partage du site (`og-cover.jpg`) et l'icône déclarées dans les pages : ce sont les seules choses que nous contrôlons directement.
- Ce que Google a déjà enregistré lors de ses passages précédents : les anciennes versions restent affichées jusqu'à ce que Google repasse sur le site.

Ce que je propose :

- Vérifier que l'image de partage `og-cover.jpg` correspond à l'identité actuelle ; si elle contient un ancien logo, la remplacer par une image 1200x630 à jour.
- S'assurer qu'il n'y a qu'une seule icône et une seule image de partage déclarées sur tout le site (pas de doublon d'ancienne version).
- Après publication, demander à Google de repasser sur le site pour qu'il remplace les anciennes images.

Point important : ces changements n'apparaissent en ligne qu'après une publication, et les résultats Google se mettent à jour au rythme de Google (quelques jours), pas immédiatement.

## Détails techniques

- `cp /mnt/user-uploads/Favicon_interw-2.svg public/favicon.svg` puis `magick public/favicon.svg -resize 64x64 -background none -gravity center -extent 64x64 public/favicon.png` (si besoin via conversion du SVG), et variante 180x180 en `public/apple-touch-icon.png`.
- `index.html` : `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` + `<link rel="alternate icon" type="image/png" href="/favicon.png" />` + `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`.
- Contrôle : aucune autre déclaration `rel="icon"` ni `og:image` ailleurs dans le projet.
- Vérification finale : build, puis capture de l'onglet et du bandeau.

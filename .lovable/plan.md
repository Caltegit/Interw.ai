# Remettre la bonne icône partout et nettoyer les logos visibles dans Google

## 1. L'icône d'onglet (favicon)

Aujourd'hui l'icône est le logo horizontal « interw » réduit en tout petit : illisible.
Retour au carré noir arrondi avec le « i » blanc, qui est l'icône officielle.

- Regénérer `public/favicon.png` à partir de l'icône carrée déjà présente dans le projet (`src/assets/logo-icon.png`), en 64x64 et en 180x180 pour l'icône d'écran d'accueil iPhone.
- Dans `index.html` : pointer l'icône vers ce fichier et ajouter la version Apple.
- Le logo horizontal reste inchangé dans le bandeau de la landing page (c'est le bon endroit pour lui).

Résultat : même icône carrée dans l'onglet du navigateur, dans les favoris, sur mobile, sur la landing comme dans l'application — un seul fichier sert partout.

## 2. Les anciens logos qui remontent dans les recherches Google

Ce que Google affiche vient de deux sources, et aucune ne se corrige en modifiant simplement une image :

- L'image de partage du site (`og-cover.jpg`) et l'icône déclarées dans les pages : ce sont les seules choses que nous contrôlons directement.
- Ce que Google a déjà enregistré lors de ses passages précédents : les anciennes versions restent affichées jusqu'à ce que Google repasse sur le site.

Ce que je propose :

- Vérifier que l'image de partage `og-cover.jpg` correspond bien à l'identité actuelle ; si elle contient un ancien logo, la remplacer par une image 1200x630 à jour.
- S'assurer qu'il n'y a qu'une seule icône et une seule image de partage déclarées sur tout le site (pas de doublon d'ancienne version).
- Après publication, demander à Google de repasser sur le site pour qu'il remplace les anciennes images.

Point important à connaître : ces changements n'apparaissent en ligne qu'après une publication, et les résultats Google se mettent à jour au rythme de Google (quelques jours), pas immédiatement.

## Détails techniques

- `magick src/assets/logo-icon.png -resize 64x64 -background none -gravity center -extent 64x64 public/favicon.png` et une variante 180x180 en `public/apple-touch-icon.png`.
- `index.html` : `<link rel="icon" type="image/png" href="/favicon.png?v=3" />` + `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`.
- Contrôle : aucune autre déclaration `rel="icon"` ni `og:image` ailleurs dans le projet.
- Vérification finale : build, puis capture de l'onglet et du bandeau.

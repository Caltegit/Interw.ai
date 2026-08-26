# Recadrer les 3 captures au format des images actuelles + aperçu dans le fond peinture

Les trois captures validées sont conservées telles quelles sur le fond ; seuls le cadrage et les dimensions changent pour qu'elles s'insèrent exactement comme les images qu'elles remplacent.

## Formats cibles (identiques aux images actuelles)

| Bloc | Image remplacée | Dimensions à respecter |
| --- | --- | --- |
| « Vos questions, posées par vous. » | product-projects.png | 2880 x 1500 |
| « Chaque candidat passe en vidéo » | product-report.png | 2880 x 2000 |
| « Les bons profils remontent, vous décidez. » | product-dashboard.png | 2880 x 1560 |

## Ce qui change sur chaque capture

1. **Critères** : recapture au bon rapport (large), sans marge vide inutile, pour remplir le cadre 2880 x 1500.
2. **Rapport de Camille Fontaine** : cadrage à partir du haut de la page (bandeau candidat, score global, matrice de fit), coupé à 2880 x 2000 — le haut du rapport est privilégié plutôt que la page entière très allongée.
3. **Liste candidats** : recadrage à 2880 x 1560, dates récentes conservées.

## Aperçu demandé

Avant tout remplacement dans le projet, je génère une image d'aperçu par bloc montrant le rendu réel : le fond peinture correspondant, la marge intérieure, le coin arrondi et l'ombre, comme sur la page d'accueil. Rien n'est modifié dans `src/assets/` ni dans la page d'accueil tant que ce n'est pas validé.

## Détails techniques

- Recapture Playwright avec des viewports au rapport cible (`deviceScaleFactor: 2`), même script d'anonymisation qu'avant (Groupe Novéa, Camille Fontaine, e-mails @exemple.fr, dates récentes).
- Composition des aperçus avec Pillow : fond peinture en `cover`, padding proportionnel au `p-10` de la section, bord arrondi + ombre.
- Après validation : remplacement de `product-projects.png`, `product-report.png`, `product-dashboard.png` dans `src/assets/`, aucun changement de code dans `Landing.tsx` (les textes restent inchangés).

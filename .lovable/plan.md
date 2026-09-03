# Écrans candidat en blanc

Passer tout le parcours candidat d'un fond sombre (dégradé noir / gris foncé) à un fond blanc, cohérent avec le reste du site.

## Bonne nouvelle : c'est centralisé

Tout le thème candidat repose sur un seul jeu de variables de couleur défini dans la feuille de style globale. Il n'y a donc pas à repasser sur chaque écran un par un : on redéfinit la palette, et les écrans suivent automatiquement — accueil du lien candidat, test micro/caméra, entretien, page de fin, page annulée, page confidentialité, démo.

## Ce qui change

**Palette candidat**
- Fond : blanc.
- Surfaces (cartes, champs, blocs) : blanc cassé très léger, comme sur la page d'accueil du site.
- Texte : noir profond, textes secondaires en gris moyen.
- Bordures : gris clair.
- Accent : noir (conforme à la charte actuelle), au lieu du blanc utilisé sur fond sombre.

**Éléments décoratifs**
- La grille de fond et les halos lumineux étaient conçus pour un fond noir. Sur blanc ils deviennent sales : on les retire, comme cela a déjà été fait sur la page d'accueil.

**Boutons et textes en dégradé**
- Le bouton principal passe du dégradé clair sur fond noir à un aplat noir avec texte blanc.
- Les titres en dégradé clair repassent en noir uni.
- La barre de progression et les barres de niveau micro passent en noir.

**Zones qui restent noires volontairement**
- L'intérieur des cadres vidéo (aperçu caméra, vignette candidat) reste noir : c'est la zone d'image, la garder blanche crée un flash désagréable avant l'affichage du flux.
- Les incrustations sur la vidéo (compteur, voile de chargement) restent claires sur fond sombre.

**Un fond noir en dur à corriger**
- L'écran de chargement du lien candidat a une couleur noire écrite en dur dans le code, hors palette : à passer en blanc également.

## Points de vigilance

- Contrastes : vérifier que les textes secondaires, les états désactivés et les messages d'erreur restent lisibles sur blanc.
- États de succès et d'alerte (vert micro OK, avertissements) : les nuances actuelles sont calibrées pour le fond sombre, à réajuster en versions plus foncées.
- Vérification visuelle écran par écran, en desktop et en mobile, avant livraison.

## Détails techniques

- `src/index.css`, bloc `.candidate-layout` (≈ lignes 374-607) : redéfinir `--l-bg`, `--l-bg-elev`, `--l-bg-elev-2`, `--l-fg`, `--l-fg-dim`, `--l-border`, `--l-accent`, `--l-accent-2` sur les valeurs claires déjà utilisées par `.landing-root` (≈ lignes 130-140).
- Supprimer le rendu de `.candidate-bg-grid` et `.candidate-hero-glow` (`src/components/CandidateLayout.tsx` lignes 56-57) et leurs règles CSS.
- `.candidate-btn-primary`, `.candidate-gradient-text`, `.candidate-progress-fill`, `.candidate-mic-bar-on`, `.candidate-avatar-halo` : remplacer les dégradés clairs par du noir / des aplats.
- `src/pages/InterviewLanding.tsx:414` : `backgroundColor: "#1a1a1a"` → blanc.
- Conserver `bg-black` sur les conteneurs vidéo de `InterviewStart.tsx` (4193, 4258, 4644) et `InterviewDeviceTest.tsx` (1076, 1101).
- Aucun changement de logique métier : uniquement présentation.

## Note

La demande précédente (fichier Excel documentant le scoring) reste ouverte et sera traitée après.

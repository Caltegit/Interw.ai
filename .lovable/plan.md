## Plan

**1. Déplacer la section "Fonctionnement"**

Ordre actuel : Hero → Social proof bar ("Déjà utilisé par 200+ recruteurs…") → Features → Fonctionnement → Comparatif…

Nouvel ordre : Hero → **Fonctionnement** → Social proof bar → Features → Comparatif…

Déplacer le bloc `<section id="how">` (lignes 415-473 de `src/pages/Landing.tsx`) juste après le Hero, avant la "social proof bar".

**2. Générer 3 images illustratives**

Via `imagegen--generate_image` (preset `standard`, ratio 4:3, sauvegarde dans `src/assets/`) :

- `step-01-setup.jpg` — Étape 01 « Créez votre projet » : mockup d'interface de configuration d'entretien (questions + critères), style 3D doux, dark background, accent violet #7c3aed.
- `step-02-link.jpg` — Étape 02 « Envoyez le lien » : illustration d'un candidat sur laptop/smartphone avec caméra activée recevant un lien d'entretien vidéo, même style.
- `step-03-report.jpg` — Étape 03 « Recevez les rapports » : mockup de rapport d'évaluation avec score circulaire et barres de compétences, même style.

Style commun : minimaliste, dark `#0a0a0a`, accents violet, pas de texte lisible (évite artefacts), cohérent avec la palette de la landing.

**3. Intégrer les images dans chaque carte d'étape**

Dans la map des 3 étapes (lignes 432-447) :
- Ajouter un champ `img` à chaque objet.
- Afficher l'image en haut de la carte (`<img>` `aspect-[4/3]` `object-cover`, bord supérieur arrondi, sans padding latéral en haut).
- Restructurer la carte : image full-bleed en haut, puis contenu (badge numéroté + titre + description) avec padding.
- Conserver le grand numéro filigrane et le titre.

**4. Vérification**

- Reload preview, vérifier le nouvel ordre des sections.
- Vérifier que les 3 images se chargent et que la grille reste alignée (desktop + mobile).
- Vérifier que l'ancre `#how` (lien navbar) fonctionne toujours.

### Fichiers touchés

- `src/pages/Landing.tsx` (déplacement de section + intégration des `<img>` + imports d'assets)
- `src/assets/step-01-setup.jpg`, `step-02-link.jpg`, `step-03-report.jpg` (nouveaux)

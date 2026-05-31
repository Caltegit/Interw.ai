Modifier `src/components/project/SessionCard.tsx` (player vidéo de la carte session) pour reprendre la mise en page du player du rapport (`SessionVideoNavigator`).

## Changements

1. **Retirer le « / 15 »** : le sélecteur affiche `Question {index + 1}` seulement (au lieu de `Question {index + 1} / {clips.length}`).

2. **Retirer le texte de la question** sous le sélecteur (le `<p>` qui affiche `currentQ.content`).

3. **Déplacer les boutons de vitesse (1× / 1.5× / 2×) en overlay sur la vidéo**, en haut à gauche, empilés verticalement — même style que `SessionVideoNavigator` (pastilles noires semi-transparentes, fond blanc quand actif).

4. **Mettre Précédent et Suivant de part et d'autre du sélecteur de question**, sur une seule ligne : `[< Précédent]  [Question N ▾]  [Suivant >]`. Plus de rangée séparée pour les boutons de vitesse.

## Fichier modifié

- `src/components/project/SessionCard.tsx` (≈ lignes 273-392)

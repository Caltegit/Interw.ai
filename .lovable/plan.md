## Objectif

Sur l'étape 1 de création de projet (champ « Photo de l'intervieweur »), n'afficher que l'avatar **Léa** dans la grille de photos prédéfinies. Tous les autres avatars (Camille, Isabelle, Catherine, Mei, Charlotte, Antoine, Karim, Hugo, Philippe, Marc, Tom) sont retirés de la sélection.

## Aperçu de ce que ça donne

La grille « Photos » (aujourd'hui 4×3 = 12 vignettes) devient une seule vignette ronde avec Léa, à côté du bouton « Télécharger » (qui reste disponible pour importer une photo personnalisée).

```text
Avant :                        Après :
[C][I][L][C]                   [L]
[M][C][A][K]
[H][P][M][T]
```

Le reste ne change pas : bouton Télécharger, aperçu de la photo sélectionnée, croix pour retirer, dialog de recadrage.

## Changements

- `src/components/project/AvatarPicker.tsx` : réduire `PHOTO_AVATARS` à la seule entrée Léa (`woman-3`). Supprimer les imports d'images devenus inutilisés (woman-1/2/4/5/6, man-1…6).
- `src/pages/ProjectNew.tsx` : l'avatar par défaut pour un nouveau projet est aujourd'hui `woman-1` (Camille). Le remplacer par `woman-3` (Léa) pour rester cohérent avec la seule option disponible. Renommer la variable `defaultCamilleAvatar` → `defaultLeaAvatar`.

## Hors périmètre

- `QuestionAvatarDialog` utilise `AvatarPicker` avec `uploadOnly`, donc la grille n'y est pas affichée : rien à changer là.
- Les fichiers d'images dans `src/assets/avatars/` sont conservés (au cas où on veuille en réintroduire), seuls les imports sont retirés.
- Aucune modification back-end, ni des projets existants (leurs `interviewer_avatar_url` restent tels quels).

Confirme et je passe en implémentation.
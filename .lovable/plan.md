## Objectif

Sur l'étape 1 du wizard, retirer la grille « PHOTOS » et afficher à droite du bouton « Télécharger » le texte : **« Importez votre photo pour personnaliser l'expérience ! Recadrage et aperçu inclus »**. La photo par défaut (Camille) reste affichée au chargement.

## Aperçu

```text
Avant :                                              Après :
Photo du recruteur                                   Photo du recruteur
[avatar] [Télécharger]                               [avatar] [Télécharger]  Importez votre photo
         Recadrage et aperçu inclus                                          pour personnaliser
PHOTOS                                                                       l'expérience !
[Léa]                                                                        Recadrage et aperçu inclus
─────                                                ─────
Fonctionnalités avancées ▾                           Fonctionnalités avancées ▾
```

## Changements

- `src/components/project/AvatarPicker.tsx`
  - Supprimer entièrement le bloc `!uploadOnly` (grille « PHOTOS » + message « Photo personnalisée sélectionnée »).
  - Retirer l'import `woman-3` et la constante `PHOTO_AVATARS`.
  - À droite du bouton « Télécharger », afficher : « Importez votre photo pour personnaliser l'expérience ! Recadrage et aperçu inclus » (`text-xs text-muted-foreground`, sur la même colonne à côté du bouton).
  - Retirer la prop `uploadOnly` et `onSelectPreset` de l'interface (plus utilisées).

- `src/components/project/ProjectForm.tsx` (ligne ~872)
  - Retirer les props `onSelectPreset` du `<AvatarPicker>`.

- `src/components/project/QuestionAvatarDialog.tsx` (si utilise `uploadOnly` / `onSelectPreset`)
  - Nettoyer les props supprimées.

## Hors périmètre

- Photo par défaut Camille : **conservée** (aucun changement dans `ProjectNew.tsx`).
- Fichiers d'avatars dans `src/assets/avatars/` : laissés en place.
- Aucune modification back-end.
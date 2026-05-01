## Objectif

Ajouter la fonction « Modifier » sur chaque carte de la bibliothèque d'intros (`src/pages/IntroLibrary.tsx`). Le dialogue actuel ne sert qu'à la création — il sera transformé en dialogue **création + édition**.

## Comportement

- Un bouton « Modifier » (icône crayon) apparaît sur chaque carte d'intro, à côté de « Supprimer ».
- Au clic, le dialogue s'ouvre pré-rempli avec les valeurs de l'intro sélectionnée.
- Le titre du dialogue devient « Modifier l'intro » (au lieu de « Nouvelle intro »).
- Le bouton de validation devient « Enregistrer les modifications ».
- Le format de l'intro (texte / TTS / audio / vidéo) reste modifiable.
- Pour les formats audio/vidéo : si l'utilisateur ne ré-enregistre rien, le fichier existant est conservé. S'il ré-enregistre, le nouveau remplace l'ancien dans le storage.

## Modifications fichier

### `src/pages/IntroLibrary.tsx`

1. **State** : ajouter `editingId`, `existingAudioUrl`, `existingVideoUrl`.
2. **`resetForm`** : réinitialiser aussi ces nouveaux champs.
3. **Nouvelle fonction `openEdit(item)`** : pré-remplit tous les champs et ouvre le dialogue.
4. **`handleSave`** : si `editingId` est défini, faire un `UPDATE` sur `intro_templates` ; sinon garder l'`INSERT` actuel. Pour les médias :
   - Si nouveau blob/file fourni → upload + remplace l'URL.
   - Sinon → conserver `existingAudioUrl` / `existingVideoUrl`.
   - Si changement de format (ex. passage de `audio` à `text`), nettoyer les URLs non pertinentes.
5. **Titre/bouton dynamique du dialogue** : « Nouvelle intro » / « Modifier l'intro », et « Sauvegarder » / « Enregistrer ».
6. **Carte** : ajouter un bouton `Modifier` (icône `Pencil` de lucide-react, déjà importée) avant `Supprimer`.

### Sécurité / RLS

Pas de migration nécessaire : la policy `Org members can update intro templates` existe déjà sur `intro_templates`. Aucun changement de schéma.

## Fichiers impactés
- **Modifié** : `src/pages/IntroLibrary.tsx` uniquement.

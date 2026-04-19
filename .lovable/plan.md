

## Plan : Bibliothèque d'avatars prédéfinis à l'étape 1

### Idée
À l'étape "Informations" de la création/édition de projet, sous le champ "Photo du recruteur", afficher une grille de 6-8 avatars prédéfinis (libres de droits) que l'utilisateur peut sélectionner en un clic, en plus de l'option "Téléverser une photo" déjà existante.

### Source des images
**DiceBear** (https://www.dicebear.com) — avatars vectoriels libres de droits (licence CC0 / MIT), générés à la volée via URL. Pas besoin de stocker les fichiers, on utilise directement l'URL publique. Style proposé : `personas` ou `avataaars` (illustrations professionnelles, style chaleureux adapté à un recruteur).

Exemple d'URL : `https://api.dicebear.com/9.x/personas/svg?seed=Sarah&backgroundColor=b6e3f4`

Alternative : **Pravatar** (https://i.pravatar.cc) — vraies photos de personnes (Unsplash / generated faces, libres de droits) si on préfère un rendu photo-réaliste.

### Question à clarifier

Avant d'implémenter, je veux savoir quel style tu préfères :

1. **Illustrations** (DiceBear "personas") — moderne, neutre, inclusif, pas de problème de droit à l'image, cohérent avec une UI SaaS.
2. **Photos réalistes** (Pravatar / generated faces) — plus humain et chaleureux, mais visages générés par IA (toujours libres de droits).
3. **Mix** — proposer une rangée de chaque.

### Implémentation (une fois le style choisi)

**Fichier modifié :** `src/components/project/AvatarPicker.tsx` (nouveau composant) + intégration dans `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` à l'étape 0.

**Composant `AvatarPicker`** :
- Liste de 8 avatars prédéfinis (URLs constantes en haut du fichier).
- Grille responsive (4 colonnes desktop / 2 mobile).
- Avatar sélectionné = ring indigo + check icon.
- Bouton "Téléverser ma propre photo" conserve le flux actuel (upload Supabase Storage).
- État contrôlé via `value` / `onChange` (URL string).

**Intégration** :
Remplacer le bloc actuel "Photo du recruteur" (input file seul) par `<AvatarPicker value={avatarUrl} onChange={setAvatarUrl} orgId={...} />`.

### Test
1. Aller sur `/projects/new` → étape Informations → vérifier que la grille de 8 avatars s'affiche.
2. Cliquer sur un avatar → vérifier la sélection visuelle (ring) et que `avatar_url` est bien la bonne URL.
3. Téléverser une photo perso → vérifier que ça écrase la sélection et fonctionne comme avant.
4. Sauvegarder le projet → vérifier en DB que `avatar_url` est correct.
5. Éditer le projet → vérifier que l'avatar choisi est bien resélectionné dans la grille.


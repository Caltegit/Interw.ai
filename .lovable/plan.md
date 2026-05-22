## Masquer le toggle « Mettre l'intro en premier écran »

L'intro sera toujours affichée en premier écran par défaut (équivalent toggle ON).

**Modifications :**

1. `src/components/project/ProjectForm.tsx`
   - Supprimer le bloc UI du toggle (lignes 720-728).
   - Conserver l'état `introFirstScreen` interne pour ne pas casser la sauvegarde, mais l'initialiser/forcer à `true`.

2. `src/pages/ProjectNew.tsx`
   - Passer `introFirstScreen: true` comme valeur initiale (au lieu de `false`).

3. `src/pages/ProjectEdit.tsx`
   - Garder la lecture depuis la BDD avec fallback `true` (`?? true`) pour les anciens projets.

Aucune migration BDD. Le champ `intro_first_screen` continue d'être sauvegardé comme avant.

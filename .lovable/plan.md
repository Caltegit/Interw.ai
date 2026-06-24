## Problème
Le Copilote IA reçoit encore `project_id = "new"` lors d’une action sur `/projects/new`. La correction précédente filtre la route dans `CopilotContext`, mais il reste des chemins où une valeur non UUID peut atteindre les requêtes Copilot, notamment création de fil, chargement des fils et envoi depuis l’état du panneau.

## Plan de correction
1. **Centraliser la validation UUID Copilot**
   - Ajouter un garde-fou unique côté hooks Copilot pour refuser tout `projectId` qui n’est pas un UUID valide.
   - Empêcher les requêtes `.eq("project_id", projectId)` et les insertions `copilot_threads` si `projectId` vaut `new`, `archives`, ou toute autre chaîne non UUID.

2. **Sécuriser l’interface du panneau**
   - Dans `CopilotPanelContent`, ne passer au chat que si le projet effectif est un UUID valide.
   - Sinon, afficher le sélecteur de projet plutôt que le chat, pour éviter toute requête invalide.

3. **Nettoyer l’état persistant du Copilot**
   - Réinitialiser `pickedProjectId` et `activeThreadId` quand la route change vers `/projects/new` ou quand le projet détecté n’est pas exploitable.
   - Éviter qu’un ancien état du panneau continue d’utiliser une valeur invalide.

4. **Améliorer l’erreur utilisateur**
   - Remplacer le toast technique `invalid input syntax for type uuid: "new"` par un message français simple si le contexte projet est invalide : `Choisissez d’abord un projet existant.`

5. **Vérification obligatoire**
   - Tester dans le navigateur : `/projects/new` → ouvrir Copilote → cliquer une suggestion → aucun toast SQL.
   - Vérifier aussi une page projet existante → le Copilote charge/crée une conversation normalement.

## Fichiers concernés
- `src/hooks/queries/useCopilot.ts`
- `src/components/copilot/CopilotPanelContent.tsx`
- éventuellement `src/contexts/CopilotContext.tsx` pour nettoyer l’état sur changement de contexte

## Résultat attendu
Le Copilote ne peut plus envoyer `"new"` à la base, même si l’état React, la route ou une ancienne conversation garde une valeur incorrecte.
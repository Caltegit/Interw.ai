## Objectif
Faire en sorte que le bouton **« Réparer la vidéo »** déclenche une réparation réellement fiable et donne un retour clair si la vidéo ne peut pas être récupérée.

## Ce que j’ai constaté
- Le clic ne laisse pas de trace réseau vers `recover-session-video`, donc il est probable que le bouton ne déclenche pas correctement la chaîne complète dans l’état actuel affiché, ou que l’échec se produise avant l’appel visible.
- La fonction `store-repaired-video` vient d’être ajoutée côté backend mais n’est pas encore déclarée dans la configuration des fonctions. Elle risque donc de ne pas être disponible côté production/prévisualisation.
- Le code frontend construit manuellement l’URL `/functions/v1/store-repaired-video`, ce qui est fragile ; il vaut mieux utiliser l’appel backend standard déjà utilisé ailleurs.

## Plan de correction
1. **Rendre l’appel de sauvegarde fiable**
   - Appeler `store-repaired-video` via le client backend standard au lieu d’un `fetch` manuel.
   - Garder les en-têtes nécessaires : session, question, extension.
   - Afficher une erreur lisible si la fonction n’est pas disponible ou refuse l’upload.

2. **Déclarer la fonction backend**
   - Ajouter `store-repaired-video` dans la configuration des fonctions avec authentification activée.
   - Vérifier aussi que `recover-session-video` est bien déclarée si elle ne l’est pas déjà dans la configuration effective.

3. **Sécuriser le flux de réparation côté interface**
   - Désactiver le bouton pendant toute la réparation.
   - Afficher l’étape en cours directement dans le bouton : reconstruction, analyse, réparation, enregistrement.
   - En cas d’échec, garder l’overlay propre et afficher le vrai message d’erreur.

4. **Corriger le cas “audio seulement”**
   - Si la réparation réussit en MP4, remplacer immédiatement l’URL du clip courant par l’URL MP4 avec cache-bust.
   - Recharger la vidéo et réinitialiser l’état `hasVideoTrack` pour forcer une nouvelle détection.

5. **Tester avant de conclure**
   - Tester le parcours sur la session concernée en prévisualisation.
   - Vérifier : clic sur « Réparer », affichage de progression, appels backend, puis rechargement de la vidéo ou message d’échec explicite.
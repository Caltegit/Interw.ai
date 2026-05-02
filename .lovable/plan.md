## Plan

Je vais solidifier l’export vidéo en deux couches : correction immédiate du convertisseur navigateur, puis repli robuste côté backend pour ne plus dépendre d’un chargement fragile dans l’onglet.

### 1. Corriger la cause racine du « Failed to fetch »
- Revoir `src/pages/SessionVideoExport.tsx`.
- Remplacer le chargement actuel du convertisseur par une configuration compatible avec Vite.
- Supprimer le chargement invalide du fichier `ffmpeg-core.worker.js` depuis le mauvais paquet.
- Héberger les fichiers du convertisseur de façon stable dans le projet, au lieu de dépendre d’un chargement externe fragile.
- Ajouter une vérification explicite du chargement du moteur avant de lancer la conversion.

### 2. Garantir un vrai résultat MP4
- Conserver directement les segments déjà en MP4.
- Convertir les segments WebM vers MP4 quand le moteur navigateur est disponible.
- Si la conversion navigateur échoue, ne plus renvoyer un ZIP partiellement en WebM.
- Basculer automatiquement vers un traitement backend en arrière-plan pour produire un ZIP uniquement en MP4.

### 3. Utiliser le backend déjà préparé pour les exports
- S’appuyer sur la table `video_export_jobs` déjà présente.
- Ajouter une fonction backend qui :
  - valide l’accès à la session,
  - crée un job d’export,
  - télécharge les segments source,
  - les convertit en MP4,
  - génère l’archive ZIP,
  - stocke le fichier dans l’espace privé prévu,
  - renvoie un lien signé quand c’est prêt.
- Lancer ce travail en arrière-plan pour éviter les limites et les plantages du navigateur.

### 4. Rendre l’interface solide et claire
- Mettre à jour `src/pages/SessionVideoExport.tsx` pour piloter les deux modes :
  - conversion locale si possible,
  - sinon job backend avec attente et rafraîchissement d’état.
- Afficher des états simples et fiables : préparation, traitement, archive prête, erreur.
- Ajouter un vrai bouton de relance en cas d’échec.
- Afficher une erreur utile et précise, au lieu du simple « Failed to fetch ».

### 5. Sécuriser le flux
- Vérifier que seul un membre autorisé de l’organisation peut demander et récupérer un export.
- Utiliser des liens temporaires pour le téléchargement final.
- Garder les fichiers d’archive en privé.

## Résultat attendu
- Le clic sur « Télécharger les vidéos » aboutit à une archive ZIP contenant uniquement des MP4.
- Si le convertisseur navigateur ne peut pas se charger, l’utilisateur n’est plus bloqué.
- L’export devient fiable même quand le navigateur, le réseau ou le volume de données posent problème.

## Détail technique
- Cause racine trouvée : le code charge `@ffmpeg/core` en mode `umd` alors que la documentation recommande `esm` avec Vite, et il tente en plus de charger `ffmpeg-core.worker.js` depuis un emplacement non valable pour cette version. C’est cohérent avec l’erreur affichée : « Le convertisseur vidéo n'a pas pu être chargé : Failed to fetch ».
- Fichiers principaux concernés :
  - `src/pages/SessionVideoExport.tsx`
  - `src/pages/SessionDetail.tsx`
  - nouvelle fonction backend d’export vidéo
  - éventuelle migration complémentaire si un champ d’état supplémentaire est utile

Si tu approuves, je passe à l’implémentation complète.
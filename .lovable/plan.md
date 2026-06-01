## Objectif

Aujourd'hui, le bouton « Télécharger » sur une vidéo de question (lecteur dans `SessionVideoNavigator`) lance la conversion WebM → MP4 **dans l'onglet courant** via `useMp4Download` (hook + worker). Si l'onglet passe en arrière-plan ou si l'utilisateur ferme la popover, la conversion est ralentie / interrompue, et rien ne se passe visiblement.

On veut le même comportement que le bouton « Télécharger toutes les vidéos », qui ouvre `/sessions/:id/export` dans un nouvel onglet dédié avec barre de progression et téléchargement final.

## Changements

### 1. Page d'export — mode « une seule question »

Étendre `src/pages/SessionVideoExport.tsx` pour gérer un paramètre `?question=<index>` (index 1-based du segment dans `segments`).

- Si le paramètre est absent → comportement actuel (zip de toutes les vidéos).
- Si le paramètre est présent :
  - On charge les segments comme aujourd'hui.
  - On ne garde que le segment ciblé.
  - On télécharge **le seul fichier**, converti en MP4 si nécessaire (réutiliser la logique de conversion déjà appelée par le worker pour les segments WebM).
  - Sortie : un fichier `.mp4` nommé `entretien-<NN>-<slug-question>.mp4` (même convention que le bouton actuel).
  - Titre de la carte adapté : « Téléchargement de la vidéo » et libellé « 1 fichier ».
  - Auto-download identique : lien déclenché automatiquement, fallback « Cliquez ici » si bloqué.

Implémentation : on peut soit étendre le worker existant (`videoExport.worker.ts`) avec un mode `single`, soit, plus simple, court-circuiter le mode zip dans la page : quand `segments.length === 1` et mode single, on appelle directement la conversion WebM→MP4 (réutiliser `videoClipToMp4.worker.ts` qui fait déjà exactement ça pour une URL unique) et on télécharge le blob MP4 sans archiver.

Approche retenue : utiliser `videoClipToMp4.worker.ts` dans la page d'export en mode single (déjà éprouvé pour un fichier). Cela évite de complexifier le worker zip.

### 2. Bouton dans `SessionVideoNavigator`

Dans `src/components/session/SessionVideoNavigator.tsx` :

- Supprimer l'usage de `useMp4Download` et l'état de progression (`dlStatus`, `dlProgress`).
- Le bouton devient un simple `window.open(`/sessions/${sessionId}/export?question=${index + 1}`, "_blank", "noopener")`.
- Le label reste « MP4 » avec l'icône `Download`, sans loader (puisque la conversion se fait dans l'autre onglet).
- Il faut donc passer `sessionId` au composant si pas déjà disponible (vérifier les props ; sinon l'ajouter et le passer depuis `SessionDetail.tsx`).

### 3. Nettoyage

- Si plus aucun composant n'utilise `useMp4Download`, garder le hook (utile potentiellement) mais ne plus l'importer ici. Vérifier avec `rg`.

## Notes techniques

- La route `/sessions/:id/export` est déjà protégée (auth requise). Idem pour le mode single — le nouvel onglet hérite de la session Supabase.
- Pas de changement DB, pas de changement edge function.
- Le worker `videoClipToMp4.worker.ts` est déjà autonome (charge FFmpeg via CDN si besoin).

## Fichiers touchés

- `src/pages/SessionVideoExport.tsx` — branche « single »
- `src/components/session/SessionVideoNavigator.tsx` — bouton ouvre un nouvel onglet
- Éventuellement `src/pages/SessionDetail.tsx` si `sessionId` doit être propagé au navigator (à vérifier)

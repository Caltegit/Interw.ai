# Plan

## État
Correctifs déployés sur le pipeline vidéo. La cause structurelle (incohérence
de format entre enregistrement, chunks, fichier final et reconstruction) est
levée. Les anciennes sessions cassées restent réparables via le bouton
"Réparer la vidéo".

## Ce qui a été fait

1. **Front (`src/pages/InterviewStart.tsx`)**
   - Les chunks sont écrits avec la **vraie extension** (`.mp4` sur Safari/iOS,
     `.webm` ailleurs) au lieu de toujours `.webm`. Plus de fichier `.webm`
     contenant des octets MP4.

2. **`finalize-abandoned-session`**
   - Détecte le format réel via `manifest.json` (sinon extension majoritaire
     des chunks).
   - Reconstruit `qN.webm` **ou** `qN.mp4` selon le cas, avec le bon
     `contentType`.
   - Pour les WebM, démarre sur le premier chunk contenant l'init segment
     EBML pour éviter les fichiers illisibles.
   - Accepte les chunks hybrides (`.webm` ou `.mp4`) pour les sessions
     produites par les versions précédentes.

3. **`recover-session-video`**
   - Même détection de format (manifest → fichier final → extension chunks).
   - Nettoie aussi l'extension "fantôme" (`q15.webm` cassé + `q15.mp4` sain).
   - Garde le mode `skip` / `truncate` / `rebuild` selon le cas.

4. **Lecteur (`SessionVideoNavigator`)**
   - Inchangé hors du strict nécessaire : reconnait déjà `.webm` et `.mp4`,
     bouton "Réparer la vidéo" envoie `force: true`.

## Validation effectuée
- Réparation `q9` de la session `955b…` : `rebuild` réussi depuis 24 chunks.
- Vérification `q5` même session : `skip` (fichier déjà valide).
- Aucune régression sur la liste des fichiers en place.

## À tester côté utilisateur
- Recharger le rapport `955b…` et lancer Q5 → Q9 dans le lecteur.
- Lancer une nouvelle interview complète et vérifier la dernière question.
- Tester une fermeture d'onglet en cours de question pour valider la
  reconstruction automatique côté serveur.

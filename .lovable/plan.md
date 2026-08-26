# Pourquoi la vidéo de la page d'accueil ne se lance plus

## Ce que montrent les vérifications

- En local, la vidéo se charge et joue normalement (fichier WebM lu, lecture en cours).
- En ligne sur interw.com, le fichier `demo-interwai-hd.webm` est renvoyé par l'hébergement avec le type `audio/webm` au lieu de `video/webm`.
- Le fichier lui-même est bien une vidéo (VP9, 1920x1080, sans piste audio).

Conséquence : le navigateur reçoit un fichier annoncé comme « audio », alors que la page demande une source vidéo. Il ne montre donc aucune image et la lecture ne démarre pas. Comme le WebM est proposé en premier, Chrome, Edge et Firefox s'arrêtent dessus et ne basculent pas sur le MP4, qui lui est correctement servi.

## Le correctif

1. Mettre le MP4 en première source de la balise vidéo (il est servi avec le bon type et fonctionne partout).
2. Retirer la source WebM tant que l'hébergement l'annonce comme audio — ou la republier sous un nom que le CDN reconnaît comme vidéo, et la remettre seulement si le type renvoyé est bien `video/webm`.
3. Garder l'affiche (poster), le chargement différé et la lecture en boucle muette tels quels.
4. Vérifier après publication que le fichier réellement chargé est le MP4 et que la lecture démarre.

## Détails techniques

- Fichier concerné : `src/pages/Landing.tsx`, composant `DemoVideo` (ordre des `<source>`).
- Contrôle post-publication : requête sur `https://interw.com/demo-interwai-hd.mp4` (type `video/mp4`, réponse 206 sur requête partielle) et vérification de `video.currentSrc` + `paused` dans le navigateur.
- Aucun ré-encodage nécessaire : les deux fichiers sont valides, seul le type MIME renvoyé pour le WebM pose problème.

# Vidéo qui ne se charge pas — session Julie Safari

## Ce que j'ai vérifié (et ma correction)

Ma première explication était incomplète, je l'ai retestée. Ce que montrent les mesures :

- Les 5 fichiers existent et l'image est intacte : j'ai extrait une image de la première vidéo, on y voit la candidate, nette. Ce n'est donc pas une question de vidéo « trop pixelisée ».
- Dans un vrai Chrome, ces fichiers refusent de démarrer dès la lecture : la tête de lecture reste à 0 et le navigateur renvoie une erreur de décodage. D'où le cadre noir.
- Une vidéo d'une autre session du même poste, testée dans les mêmes conditions, se lit normalement. Le problème est donc bien propre à ces fichiers, pas au lecteur d'Interw.
- Différence concrète entre les deux : les vidéos qui marchent sont enregistrées en VP9 ; celles de Julie sont en VP8, 640×480, avec une piste son mal formée (en-tête audio illisible, horodatage négatif) et aucune durée inscrite.

Le lien avec ce que je t'avais dit l'autre fois : le VP8 en 640×480 est bien le signe d'un ordinateur ou d'un navigateur limité, qui bascule sur un mode d'enregistrement dégradé. Mais la conséquence n'est pas une image moche : c'est un fichier mal « emballé » que Chrome refuse d'ouvrir.

Preuve que c'est réparable : j'ai réencapsulé la première vidéo (sans retoucher l'image ni le son) et elle se lit parfaitement, avec sa durée correcte de 1 min 19.

## Ce que je propose

1. **Réparer les 5 vidéos de cette session** par réencapsulation, pour qu'elles se lisent normalement dans la fiche candidat. Aucune perte de qualité, aucun impact sur le transcript, le score ou le rapport.
2. **Réparation automatique quand une vidéo refuse de démarrer** : aujourd'hui la réparation existe mais dépend d'un clic sur « Réparer la vidéo ». Elle se déclenchera une fois toute seule à la première erreur de lecture, avec le message « Réparation de la vidéo… » au lieu d'un cadre noir muet.
3. **Filet de sécurité en attendant** : l'audio et le transcript restent accessibles pendant la réparation.

## Détails techniques

- Diagnostic reproduit : `PIPELINE_ERROR_READ: FFmpegDemuxer: demuxer seek failed` dès `play()`, `duration = Infinity`, `currentTime` bloqué à 0 ; `ffprobe` signale `Error parsing Opus packet header` et `start_time = -0.001` sur la piste audio.
- Remux `ffmpeg -c copy` validé : durée 79,387 s, lecture Chrome OK.
- Réparation des messages `q0`–`q4` de la session `357ffa75-6bcb-4ced-a05b-a933f3c8fc8d` via la fonction existante `recover-session-video` (mode transcodage) ; vérification de la lecture après coup.
- `src/components/session/SessionVideoNavigator.tsx` : sur `onError` d'un clip, appel automatique unique de `handleRecover()` par `messageId` (référence anti-boucle), état « réparation en cours » distinct de l'état d'erreur, bouton manuel conservé.

Aucune modification du scoring, des rapports ou du comportement des autres organisations.

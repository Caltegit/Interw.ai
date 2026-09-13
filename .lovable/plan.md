# Vidéo qui ne se charge pas — session Julie Safari

## Ce qui se passe

Les 5 vidéos de cette session existent bien et sont intactes : j'ai téléchargé la première et extrait une image, on y voit la candidate, tout est là (2 368 images, environ 5,8 Mo).

Le problème vient de la lecture. Les entretiens sont enregistrés « au fil de l'eau » par le navigateur du candidat : le fichier obtenu n'indique nulle part sa durée. Pour contourner ça, le lecteur d'Interw fait une astuce : il envoie la tête de lecture très loin dans le fichier pour que le navigateur en déduise la durée.

Sur cette session, cette astuce échoue : la piste audio du fichier est mal formée (en-tête audio illisible), et Chrome abandonne la lecture avec l'erreur `PIPELINE_ERROR_READ: demuxer seek failed`. Résultat : cadre noir, rien ne démarre. J'ai reproduit exactement ce comportement dans un navigateur de test.

Autrement dit : ce n'est pas la vidéo qui est perdue, c'est le lecteur qui se bloque sur une réparation de durée qui ne marche pas sur ce fichier.

## Ce que je propose

1. **Rendre le lecteur résistant.** Si la détection de durée échoue, le lecteur ne reste plus bloqué sur un cadre noir : il recharge la vidéo sans l'astuce et lit depuis le début.
2. **Réparation automatique.** Si la lecture échoue quand même, la réparation déjà existante (aujourd'hui manuelle, derrière le bouton « Réparer la vidéo ») se déclenche toute seule une fois, puis relance la lecture. Le bouton manuel reste disponible.
3. **Message clair.** Tant que la réparation tourne, on affiche « Réparation de la vidéo… » au lieu d'un écran noir muet, avec l'audio et le transcript accessibles en attendant.
4. **Réparer cette session tout de suite.** Les 5 vidéos de Julie Safari sont repassées par la réparation pour qu'elles se lisent normalement sans attendre.

## Détails techniques

- `src/components/session/SessionVideoNavigator.tsx` : `fixDuration()` écoute l'évènement `error` pendant le scrub ; en cas d'échec (`MEDIA_ERR_DECODE` / `PIPELINE_ERROR_READ`), on annule le scrub, on `load()` puis on lit à `currentTime = 0` sans réappliquer l'astuce (drapeau par clip).
- Après un échec de lecture, appel automatique unique de `handleRecover()` (fonction `recover-session-video`, avec transcodage) par clip, au lieu d'attendre un clic ; anti-boucle via une référence par `messageId`.
- Overlay d'erreur : état « réparation en cours » distinct de l'état « erreur », audio et transcript conservés.
- Réparation ponctuelle des messages `q0`–`q4` de la session `357ffa75-6bcb-4ced-a05b-a933f3c8fc8d` via la fonction existante, sans toucher aux données de scoring ni au rapport.

Aucune modification du moteur d'analyse, du scoring ou d'autres organisations.

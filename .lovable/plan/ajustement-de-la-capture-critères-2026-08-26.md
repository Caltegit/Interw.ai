# Ajustement de la capture « Critères »

Seule l'image du bloc « Vos questions, posées par vous » est reprise. Les deux autres captures (rapport et liste candidats) restent telles que validées.

## Ce qui change

1. Titre de l'écran : « Modifier le poste » remplacé par « Conseiller clientèle ».
2. Cadrage fidèle à l'écran réel de création de poste : marges gauche et droite conservées (le formulaire n'est plus collé aux bords), interface un peu dézoomée pour que plusieurs critères apparaissent en entier (au moins 3 blocs de critères avec leur pondération et leur description).
3. Même format final que l'image remplacée (2880 x 1500), donc rendu identique dans le fond peinture.

## Détails techniques

- Nouvelle capture Playwright sur l'app locale, session authentifiée, mode clair, sidebar dépliée, `deviceScaleFactor: 2`.
- Viewport plus large et zoom page réduit (~0,8) pour rétablir les marges latérales du conteneur et faire tenir plus de critères dans la hauteur cible.
- Anonymisation DOM avant capture, identique aux autres images (organisation « Novéa », aucun nom réel).
- Nouvel aperçu incrusté dans le fond peinture envoyé pour validation avant tout remplacement dans `src/assets/`.

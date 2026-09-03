# Nouvelle image de partage (aperçu des liens candidats)

## Ce qui se passe aujourd'hui
Quand un lien est collé dans WhatsApp, LinkedIn ou Slack, l'aperçu affiche toujours la même image : `public/og-cover.jpg`, déclarée une seule fois dans `index.html` (`og:image` + `twitter:image`). C'est le visuel violet foncé « Interw.ai — Sessions vidéo IA pour le recrutement », resté du temps du domaine `.ai` et du thème sombre.

Comme l'application est une application monopage, toutes les pages (landing, lien candidat, poste) partagent cet unique aperçu : il n'y a pas d'image spécifique par candidat.

## Ce que je propose
1. Créer un nouveau visuel 1200 × 630 :
   - fond blanc, aucune grille ni halo,
   - mot-symbole « Interw.com » en noir, typographie proche de l'interface,
   - une ligne d'accroche discrète en gris moyen : « Entretiens vidéo asynchrones »,
   - fine bordure/arrondi et respiration façon carte shadcn, palette strictement noir / blanc / gris.
2. Remplacer `public/og-cover.jpg` par ce visuel (même nom de fichier, donc aucun autre lien à modifier), avec un paramètre de version dans l'URL pour forcer les plateformes à recharger l'aperçu.
3. Mettre à jour la description sociale si besoin pour rester cohérente avec `interw.com`.

## Détails techniques
- Fichier : `public/og-cover.jpg` (1200 × 630, JPG).
- `index.html` : `og:image` et `twitter:image` passent à `https://interw.com/og-cover.jpg?v=2`, `og:image:alt` ajouté.
- WhatsApp et LinkedIn gardent l'ancienne image en cache plusieurs jours : après publication, il faudra rafraîchir via le LinkedIn Post Inspector, et l'astuce du `?v=2` règle le cas WhatsApp.
- Aucun changement fonctionnel côté candidat.

## Limite connue
Un aperçu personnalisé par poste ou par candidat (nom du poste dans l'image) n'est pas possible sans rendu côté serveur ; je peux le chiffrer séparément si vous le souhaitez.

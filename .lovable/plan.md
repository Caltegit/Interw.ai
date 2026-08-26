# Ajustements des 3 captures produit

Les trois images sont refaites avec les corrections demandées, toujours en données fictives (Groupe Novéa, Camille Fontaine, e-mails @exemple.fr, avatars en initiales).

## 1. Liste des candidats (« Conseiller clientèle »)

- Dates remplacées par des dates très récentes : réparties sur les 5 derniers jours (aujourd'hui, hier, avant-hier…), avec quelques « il y a 2 h » en haut de liste.
- Le reste inchangé : noms fictifs, scores, pastilles de décision.

## 2. Écran « Vos questions, posées par vous »

- On ne montre plus l'onglet Questions mais l'écran des **critères d'évaluation** : liste des critères pondérés (ex. Sens du service, Clarté d'expression, Gestion des objections, Rigueur, Motivation) avec leurs poids et la répartition.
- Le titre du bloc sur la page d'accueil sera ajusté en conséquence lors de l'intégration (proposition : « Vos critères, votre grille de lecture. ») — à valider.

## 3. Rapport de Camille Fontaine

- Capture non coupée : page entière, du bandeau candidat jusqu'au bas du rapport, pour montrer le calcul du score (score global, matrice de fit par critère, points forts / points de vigilance, verbatims).
- Cadrage vertical plus haut, quitte à ce que l'image soit plus allongée que les deux autres.

## Détails techniques

- Captures Playwright sur l'app locale, session authentifiée, `deviceScaleFactor: 2`, mode clair, sidebar dépliée.
- Anonymisation par substitution DOM juste avant la capture (noms, e-mails, dates, logo et nom d'organisation) — aucune donnée réelle dans l'image, aucune écriture en base.
- Nouvelles previews envoyées dans le chat avant tout remplacement dans `src/assets/`.

## Point à confirmer

Le bloc 1 de la page d'accueil s'intitule aujourd'hui « Vos questions, posées par vous. » : je change le titre pour parler des critères, ou je garde le texte actuel avec l'image des critères ?

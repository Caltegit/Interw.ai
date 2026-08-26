# Nouvelles images produit pour les 3 blocs de la page d'accueil

Objectif : remplacer les 3 captures actuelles (`product-projects.png`, `product-report.png`, `product-dashboard.png`), qui ne reflètent plus l'interface d'Interw, par des captures fidèles à l'application telle qu'elle est aujourd'hui, avec des données entièrement fictives.

## Ce qui est prévu

1. Capture réelle de l'interface actuelle (pas d'image générée par IA) sur les trois écrans qui correspondent aux trois blocs :
   - « Vos questions, posées par vous. » → écran de création / configuration d'un poste (questions + critères)
   - « Chaque candidat passe en vidéo » → rapport d'entretien d'un candidat (lecteur vidéo + analyse)
   - « Les bons profils remontent, vous décidez. » → liste des candidats triée par score
2. Anonymisation complète avant la capture : noms et prénoms de candidats génériques (Camille Martin, Thomas Leroy, Sarah Benali, Julien Moreau…), emails en `prenom.nom@exemple.fr`, photos remplacées par des avatars neutres (initiales), organisation recruteuse fictive (« Groupe Novéa ») avec un logo neutre, intitulés de poste génériques (« Chargé de clientèle », « Conseiller commercial »).
3. Rendu en haute définition (largeur 2880 px, écran de démonstration net, mode clair, sidebar dépliée), cadrage cohérent entre les trois pour un rendu homogène sur les fonds peints.
4. Envoi des trois previews en aperçu dans le chat avant tout remplacement. Rien n'est modifié dans la page d'accueil tant que vous n'avez pas validé.
5. Après validation : remplacement des trois fichiers d'images et mise à jour des textes alternatifs si besoin.

## Détails techniques

- Captures via Playwright sur l'application locale, session authentifiée, viewport 1440x900 en `deviceScaleFactor: 2`.
- Anonymisation par substitution dans le DOM juste avant la capture (remplacement des textes de noms/emails, masquage des avatars par des pastilles d'initiales, remplacement du logo d'organisation) — aucune donnée réelle ne subsiste dans l'image, et aucune donnée en base n'est modifiée.
- Les previews sont déposées dans les fichiers du projet (`/mnt/documents`) pour relecture ; le remplacement final se fait dans `src/assets/` et reste référencé à l'identique dans `src/pages/Landing.tsx`.
- Si un écran ne peut pas être rendu proprement avec des données de démonstration suffisantes, un jeu de données de démonstration temporaire sera créé dans une organisation de test dédiée, puis supprimé après capture.

## Point à confirmer

Le nom de l'entreprise fictive affichée dans les captures : « Groupe Novéa » par défaut, dites-moi si vous préférez autre chose.

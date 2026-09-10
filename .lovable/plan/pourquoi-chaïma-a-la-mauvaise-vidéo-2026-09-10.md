# Pourquoi Chaïma a la mauvaise vidéo

## Ce qui s'est passé

Chaïma Belhadj n'a jamais enregistré de réponse. Dans l'export, la colonne
« durée du média » de sa ligne est vide, alors que les autres candidates ont
une durée (90 s pour Célia, par exemple).

Sa page de partage contient malgré tout deux vidéos : ce sont les vidéos de
consigne de Tango (12 s et 7 s, « Salut, c'est Léa de Tango… »), présentes sur
toutes les pages. Le script prenait simplement la première vidéo trouvée sur la
page. Pour les candidates qui ont répondu, la première vidéo est bien leur
réponse ; pour Chaïma, il n'y avait pas de réponse, donc il a récupéré la
consigne — d'où le score de 8.

Vérifié : la page de Célia contient trois vidéos (sa réponse de 90 s + les deux
mêmes consignes), celle de Chaïma seulement les deux consignes.

Sur les 2 734 lignes du fichier, 412 n'ont aucune durée : ce sont des lignes
sans réponse vidéo. Sans correctif, elles produiraient toutes une fiche fausse
comme celle de Chaïma.

## Correctif avant d'importer les 30 suivants

1. Ignorer toute ligne sans durée de média : pas de réponse, pas de fiche.
2. Choisir la bonne vidéo sur la page : retenir celle dont la durée correspond
   à la durée indiquée dans le fichier, et jamais les vidéos de consigne.
3. Si aucune vidéo ne correspond, la ligne est ignorée et signalée dans le
   récapitulatif, plutôt qu'importée à tort.
4. Supprimer la fiche erronée de Chaïma Belhadj.
5. Relancer une simulation sur les 30 candidats suivants, afficher la liste
   retenue et les lignes écartées, puis importer après ta validation.
   Toujours zéro e-mail envoyé.

## Détails techniques

- `scripts/import-external-candidates.ts` : lire la colonne de durée
  (`Q1. Media Duration`) dans le mapping, filtrer les lignes vides, et dans
  `extractAudio` sélectionner l'URL média dont `media_duration` correspond
  (tolérance 1 s) au lieu de la première occurrence de la regex.
- `supabase/functions/import-external-candidates/index.ts` : même règle dans
  `resolveMediaUrl`, plus refus explicite (candidat marqué `skipped`) si aucune
  correspondance de durée n'est trouvée.

# Pourquoi les photos rondes des candidats sont vides

## Ce que montrent les vérifications

Les vignettes ne sont pas « perdues » : elles existent bien.

- Sur les 10 dernières semaines, la quasi-totalité des entretiens terminés ont une vignette enregistrée (ex. semaine du 31/08 : 13 vignettes sur 16 entretiens).
- Les fichiers se téléchargent correctement (réponse 200), taille 1 358 octets, format 320x320.
- Analyse des 3 vignettes les plus récentes (3 septembre) : luminosité moyenne **0.0**, écart-type **0.0** → l'image est **entièrement noire**.

Donc l'image s'affiche bel et bien, mais elle est noire, ce qui donne visuellement un rond vide dans la liste des candidats.

## Cause

La photo est prise à la fin du premier segment enregistré, dans `src/pages/InterviewStart.tsx`, via une balise vidéo créée à la volée et jamais insérée dans la page. Ce lecteur invisible reçoit le flux caméra puis on dessine deux images plus tard sur un canvas. Sur les navigateurs actuels, un lecteur détaché de la page ne produit pas toujours d'image exploitable : le canvas récupère du noir.

Deux aggravants :

1. Aucun contrôle de qualité : l'image noire est quand même envoyée et enregistrée en base, ce qui verrouille la vignette (le drapeau interne considère la capture réussie et n'essaie plus).
2. Le repli « extraire une image de la vidéo enregistrée » n'est jamais atteint, puisque la première capture est considérée comme un succès.

## Correction proposée

1. Capturer depuis le lecteur vidéo déjà visible à l'écran (celui qui affiche le candidat pendant l'entretien) plutôt que depuis un lecteur invisible.
2. Ajouter une validation de l'image avant envoi : si l'image est quasi noire ou uniforme, elle est rejetée.
3. Si la capture est rejetée, réessayer aux segments suivants de l'entretien (le drapeau « capture faite » n'est posé qu'après une image valide), puis en dernier recours extraire une image de la vidéo enregistrée avec la même validation.
4. Nettoyer l'existant : repérer les vignettes noires déjà stockées et les neutraliser afin que la liste retombe proprement sur les initiales du candidat au lieu d'un rond noir.

## Détails techniques

- `src/pages/InterviewStart.tsx` : `captureStreamSnapshot` prendra en entrée l'élément de `videoRef` s'il est monté et prêt, sinon repli sur le flux ; ajout d'une fonction de contrôle de luminance/variance sur le canvas avant `toBlob` ; `thumbnailCapturedRef` passé à `true` uniquement après validation.
- `src/components/session/SessionVideoThumb.tsx` : inchangé, le repli initiales existe déjà.
- Nettoyage : passage de contrôle sur les vignettes existantes, mise à `null` de `sessions.thumbnail_url` pour celles détectées entièrement noires.

## Vérification

Passer un entretien de test, vérifier que la vignette générée n'est plus noire, puis contrôler la vue liste d'un poste : photos visibles pour les nouveaux entretiens, initiales pour les anciens nettoyés.

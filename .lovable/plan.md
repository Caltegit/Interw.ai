# Revenir au calcul de score d'avant la matrice

## Le constat

Depuis le passage à la matrice, le score global d'un candidat est **uniquement**
la moyenne pondérée des colonnes de la matrice. Or chaque case où l'IA n'a
trouvé aucun élément est forcée à **50/100** et compte quand même dans la
moyenne. Résultat : tous les candidats sont tirés vers le centre et l'écart
entre un bon et un moyen profil s'écrase.

Exemple mesuré sur la session Marine Fiaud : score IA 90, score matrice 76,
c'est le 76 qui est retenu.

## Ce qu'on rétablit

L'ancienne formule, dite **hybride**, qui existe toujours dans le code :

```text
score final = moyenne( note globale IA , score d'adéquation aux critères IA )
```

La note globale IA juge l'entretien dans son ensemble ; le score d'adéquation
vient de l'évaluation critère par critère produite par le même modèle. Cette
combinaison redonne de l'amplitude entre candidats.

## Ce qu'on garde

La matrice reste **entièrement en place** : le tableau question × critère, les
justifications, les citations du transcript et les repères vidéo « Q5 · 1:15 ».
Elle continue d'expliquer au recruteur sur quelle phrase l'IA s'est appuyée.
Elle devient un outil de lecture, plus le moteur de la note.

## Le correctif

### 1. La matrice ne réécrit plus la note

`generate-fit-matrix` cesse d'écraser `overall_score`, `recommendation` et
`criteria_scores` du rapport. Il n'écrit plus que la matrice elle-même dans
les statistiques du rapport.

### 2. Le rapport reprend la formule hybride

`generate-report` calcule à nouveau le score final comme moyenne de la note
globale IA et du score critères IA, et conserve la recommandation issue du
modèle. La méthode enregistrée redevient `hybrid_v1`, ce qui permet de savoir
d'un coup d'œil quels rapports ont été notés avec quelle règle.

### 3. Les cases « non évaluées » ne pèsent plus dans la matrice

Dans la matrice affichée, une case sans élément d'évaluation n'est plus
comptée comme 50 dans la moyenne de sa colonne : elle est marquée « non
évalué » et exclue du calcul de la colonne. Un critère dont aucune case n'est
évaluable reste sans moyenne. La matrice devient ainsi lisible sans introduire
de faux neutres.

### 4. Cohérence de la carte « Adéquation selon les critères »

Cette carte réaffiche les scores par critère produits par l'IA (avec leurs
justifications et citations), comme avant la matrice, au lieu des moyennes de
colonnes.

## Effet sur les rapports existants

Aucune réécriture rétroactive : les rapports déjà générés gardent leur note
actuelle. Seuls les rapports générés ou régénérés après le correctif utilisent
la formule rétablie. Une session régénérée verra donc son score remonter — c'est
attendu.

## Vérification

- Régénérer la session Marine Fiaud : le score doit repasser autour de 90 et
  la matrice doit rester affichée avec ses justifications intactes.
- Régénérer une session moyenne et vérifier que l'écart avec la précédente est
  nettement plus marqué qu'aujourd'hui.
- Vérifier qu'aucune colonne de matrice n'affiche 50 par défaut.

## Hors périmètre

- Le décalage entre le score de l'e-mail et celui de l'interface (e-mail envoyé
  avant la fin du recalcul) : à traiter juste après, une fois le calcul stabilisé.
- Les analyses orale, attitude et personnalité, inchangées.

## Fichiers concernés

- `supabase/functions/generate-fit-matrix/index.ts` — ne plus patcher la note,
  exclure les cases non évaluées des moyennes
- `supabase/functions/generate-report/index.ts` — rétablir la formule hybride

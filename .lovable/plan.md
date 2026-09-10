# Tango — noter les candidats VideoAsk avec les critères Interw

Objectif : vérifier sur 3-4 candidats réels qu'Interw peut remplacer le visionnage manuel, avant d'industrialiser l'import.

## Étape 1 — Le test (maintenant)

Tu m'envoies les transcriptions une par une (la première, Célia Marchioni, est déjà arrivée). Pas besoin des vidéos.

Pour chaque candidat, je produis :

1. **Un découpage automatique** : je repère dans le monologue les passages qui répondent aux 5 questions du poste « Vidéo de présentation ». Un passage qui ne correspond à aucune question est rattaché à « hors questions ». Une question sans passage est marquée non traitée — jamais devinée.
2. **Une notation sur transcription uniquement**, avec les critères et pondérations déjà définis dans le poste :
   - Expression orale (35 %) — clarté, phrases construites, tics de langage, réponses complètes.
   - Ton et attitude (35 %) — jugé sur la manière de tourner les phrases : chaleur, adresse à l'interlocuteur, ton récité ou trop familier. Le sourire et le regard caméra ne sont pas jugés, c'est dit explicitement.
   - Cadre et présentation (30 %) — non évalué, aucune preuve dans le texte.
3. **Le score final** calculé comme dans Interw : moyenne pondérée des critères évalués, les critères sans preuve exclus du calcul (ils ne pénalisent pas). Chaque note est justifiée par une citation exacte du candidat.
4. **Une recommandation** selon l'échelle Interw : 80+ fortement recommandé, 65-79 recommandé, 45-64 à discuter, moins de 45 non recommandé.

Quand les 3-4 candidats sont passés, je te rends un récapitulatif comparatif et tu me dis si les notes correspondent à ton jugement.

## Étape 2 — La fonction (si le test est concluant)

On ajoute dans un poste un bouton « Importer une vidéo » : tu déposes un fichier, Interw le transcrit, le découpe par question, le note et crée une fiche candidat identique à celles des entretiens passés dans l'outil — même matrice, même rapport, même tableau de bord. On chiffrera cette étape séparément.

## Point d'attention

Le critère « Cadre et présentation » (30 % du poids) restera toujours non évalué tant qu'on reste sur la transcription. Les scores Tango porteront donc sur 70 % des critères, redistribués entre les deux autres. Si tu veux ce critère un jour, il faudra analyser l'image.

## Détails techniques

- Découpage + notation : un appel par candidat sur `google/gemini-3.8-flash`, sortie structurée `{question_index, criterion, score, justification, citation}` avec `not_evaluated: true` quand aucune preuve.
- Source des critères et questions : projet `eb7db435` (Tango / « Vidéo de présentation »), 5 questions et 3 critères 35/35/30.
- Aucun code du projet n'est modifié à l'étape 1 : le travail se fait hors application, le résultat est rendu dans le chat.

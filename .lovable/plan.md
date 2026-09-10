# Tango — noter des vidéos VideoAsk avec Interw

Objectif : vérifier sur 3-4 vidéos réelles qu'Interw peut remplacer le visionnage manuel, avant d'industrialiser l'import.

## Étape 1 — Le test (maintenant)

Tu m'envoies les vidéos (jusqu'à 4, 20 Mo max chacune ; si elles sont plus lourdes, envoie seulement la piste audio).

Pour chaque vidéo, je produis :

1. **La transcription complète** du monologue, en texte propre.
2. **Un découpage automatique** : je repère dans le monologue les passages qui répondent aux 5 questions du poste « Vidéo de présentation ». Si un passage ne correspond à aucune question, il est rattaché à « hors questions ». Si une question n'a aucun passage, elle est marquée non traitée — jamais devinée.
3. **Une notation sur transcription uniquement**, avec les critères et pondérations déjà définis dans le poste :
   - Expression orale (35 %) — clarté, phrases construites, tics de langage, réponses complètes.
   - Ton et attitude (35 %) — noté sur la manière de tourner les phrases : chaleur, adresse à l'interlocuteur, ton récité ou trop familier. Le sourire et le regard caméra ne sont pas jugés, c'est dit explicitement.
   - Cadre et présentation (30 %) — non évalué, aucune preuve dans le texte.
4. **Le score final** calculé comme dans Interw : moyenne pondérée des critères évalués, les critères sans preuve exclus du calcul (ils ne pénalisent pas). Chaque note est justifiée par une citation exacte du candidat.

Je te rends un récapitulatif comparatif des candidats, et tu me dis si les notes correspondent à ton jugement.

## Étape 2 — La fonction (si le test est concluant)

Si le résultat te convient, on ajoute dans un poste un bouton « Importer une vidéo » : tu déposes un fichier, Interw le transcrit, le découpe par question, le note et crée une fiche candidat identique à celles des entretiens passés dans l'outil — même matrice, même rapport, même tableau de bord. On chiffrera cette étape séparément.

## Point d'attention

Le critère « Cadre et présentation » (30 % du poids) restera toujours non évalué tant qu'on reste sur la transcription. Les scores Tango porteront donc en pratique sur 70 % des critères, redistribués. Si un jour tu veux ce critère, il faudra analyser l'image.

## Détails techniques

- Transcription : Lovable AI, modèle `google/gemini-3.5-transcribe`, français auto-détecté. Extraction de la piste audio en local si la vidéo est volumineuse.
- Découpage + notation : un appel par candidat sur un modèle de chat, sortie structurée `{question_index, criterion, score, justification, citation}`, avec `not_evaluated` quand aucune preuve.
- Source des critères et questions : projet `eb7db435` (Tango / « Vidéo de présentation »), 5 questions et 3 critères 35/35/30.
- Aucun code du projet n'est modifié à l'étape 1 ; le travail se fait hors application et le résultat est rendu dans le chat.

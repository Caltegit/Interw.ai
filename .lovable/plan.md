# Roue « Profil Interw » entièrement grise

## Constat vérifié
- Le gris ne vient pas de l'affichage : pour Lucile Charpentier, les 8 profils sont enregistrés en « Non évalué » (aucune note).
- Cause, lue dans le calcul : depuis le durcissement d'hier, une note n'est acceptée que si elle s'appuie sur une citation tirée d'une des 3 **questions Profil Interw**. Le poste « Première étape Castalie » n'a pas ces questions, donc tout est rejeté et la roue reste grise.
- Ampleur : les 20 rapports calculés avec la nouvelle règle sont concernés dès qu'ils n'ont pas de question Profil (les 2 d'aujourd'hui : 0 profil noté).

## Correction proposée
1. Si le poste contient les questions Profil : règle actuelle inchangée.
2. Si le poste n'en contient pas : l'IA peut noter à partir des autres réponses du candidat, toujours avec citation exacte vérifiée ; la confiance est alors limitée à « moyenne » au maximum. Un profil sans preuve reste « Non évalué ».
3. Recalculer les rapports dont la roue est entièrement grise (environ 20), sans toucher au reste du rapport.

## Impact
- Candidat : aucun effet.
- Recruteur : les roues grises retrouvent des couleurs ; rien d'autre ne change (Fit Poste, matrice, notes, recommandation intacts).
- Base : aucune modification de structure ; seule la case « profil » des rapports gris est réécrite.
- Casse possible : très faible, une seule fonction serveur modifiée et redéployée. Coût IA : environ 20 recalculs.

## Vérification
- Test E2E candidat puis recruteur (bloqués par le module de configuration manquant, déjà connu).
- Contrôle direct : fiche de Lucile Charpentier, roue colorée avec citations cliquables.

## Détails techniques
- `supabase/functions/compute-interw-profiles/index.ts` : si `dedicatedQuestionIds.size === 0`, accepter les preuves de tout message candidat (`hasExactQuote` conservé), adapter la consigne du prompt, plafonner `confidence` à `medium`.
- Recalcul via `force: true` pour les rapports dont aucun profil n'a de score.

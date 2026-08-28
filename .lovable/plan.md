# Corriger l'écart entre le score de l'e-mail et le score réel

## Le problème constaté

Session Marine Fiaud (27 août) : l'e-mail annonce **90/100 · Fortement
recommandé**, l'interface affiche **76/100 · Favorable**. Le 76 est le bon
chiffre.

Cause confirmée par les horodatages en base :

```text
09:54:20  generate-report termine        -> écrit overall_score = 90
09:54:33  e-mail "interview-report" part -> envoie 90
09:54:57  generate-fit-matrix termine    -> écrase overall_score = 76
```

`generate-fit-matrix` recalcule le score à partir de la moyenne pondérée des
critères (63 / 76 / 81 / 83, poids 24/23/23/30 = 76) et écrase
`overall_score` **et** `recommendation` du rapport. Mais l'e-mail est déjà
parti 24 secondes plus tôt, avec la valeur provisoire.

Tous les rapports envoyés par e-mail depuis la mise en place de la matrice
sont potentiellement concernés, pas seulement celui-ci.

Second défaut visible sur le même e-mail : « Meilleur moment : Question
**NaN** ». En base `best_question_idx` est vide ; le gabarit lui ajoute `+1`
et affiche `NaN`.

## Le correctif

### 1. Envoyer l'e-mail après la matrice, jamais avant

Déplacer le déclenchement de l'e-mail « nouveau rapport » hors de
`generate-report`. Le worker `process-report-queue` enchaîne déjà
`generate-report` puis `generate-fit-matrix` ; l'envoi se fera à la fin de
cette séquence, une fois le score définitif écrit.

Conséquence : l'e-mail annonce toujours le même score que l'interface.
Le délai d'envoi augmente d'environ 30 secondes, sans impact utilisateur.

### 2. Garantir l'idempotence

Conserver la clé d'idempotence par session pour qu'un rapport régénéré
n'envoie pas un second e-mail aux recruteurs.

### 3. Corriger l'affichage « Question NaN »

Dans le gabarit `interview-report`, ne montrer la ligne « Meilleur moment »
que lorsque l'index **et** le score existent réellement, et masquer la ligne
sinon plutôt que d'afficher une valeur vide.

### 4. Vérification

- Régénérer le rapport d'une session témoin et comparer le score de l'e-mail
  reçu avec celui affiché sur la fiche candidat : ils doivent être identiques.
- Vérifier qu'un seul e-mail part par régénération.
- Confirmer que la ligne « Meilleur moment » n'affiche plus jamais `NaN`.

## Ce que je ne touche pas

- Le calcul du score lui-même : la matrice fait foi, le 76 est correct.
- Les rapports déjà générés : leurs scores en base sont justes, seuls les
  e-mails déjà partis restent erronés (rien à rattraper côté données).
- L'e-mail de remerciement candidat, qui ne contient aucun score.

## Fichiers concernés

- `supabase/functions/generate-report/index.ts` — retirer l'envoi de l'e-mail
- `supabase/functions/process-report-queue/index.ts` — envoyer après la matrice
- `supabase/functions/_shared/transactional-email-templates/interview-report.tsx`
  — garde sur « Meilleur moment »

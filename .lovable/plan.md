# Corriger le scoring des candidats importés (Tango)

## Ce que j'ai vérifié

**1. Les candidats importés sont pénalisés par la découpe en questions.**
Joséphine Fresneau : la matrice lui donne 71 en expression orale et 74 en ton et attitude — comparable à Angel Dominianni (67 / 71), qui affiche pourtant 72/100 contre 62/100 pour elle. L'écart vient de la note d'ensemble : l'IA note chaque question du poste séparément et attribue 3/10 à « Qu'est-ce qui t'a donné envie d'accompagner des personnes âgées ? » avec le commentaire « Question non traitée en détail » — alors que cette question n'a jamais été posée, la candidate ayant envoyé une seule vidéo libre.

**2. Le transcript est amputé par la découpe.**
Le découpage automatique attribue à chaque question un extrait du monologue et jette tout ce qui ne correspond à aucune question. C'est pourquoi la question 1 de Joséphine n'affiche que « Bonjour, moi c'est Joséphine. » alors qu'elle parle bien plus longtemps.

**3. Aucune analyse orale : ce n'est pas un problème de piste audio.**
L'audio est bien présent. L'analyse orale exige au minimum deux extraits audio distincts ; une vidéo unique n'en fournit qu'un, donc elle s'arrête d'elle-même. Les neuf fiches importées portent la mention interne « pas assez d'audio ». L'analyse orale est bien activée sur le poste Tango.

## Ce que je vais faire

### A. Une seule réponse, un transcript complet
- Supprimer le découpage par question pour les entretiens importés : une seule réponse candidat, contenant l'intégralité du monologue transcrit, rattachée à aucune question.
- Rien n'est jeté : le texte affiché sur la fiche est le transcript complet de la vidéo.

### B. Notation par critères uniquement
- Pour ces entretiens, l'évaluation se fait critère par critère sur l'ensemble du monologue, en respectant la pondération du poste (Expression orale 35 %, Ton et attitude 35 %, Cadre et présentation 30 %).
- Plus aucune note par question, donc plus aucune pénalité pour une question jamais posée.
- Un critère sans preuve reste « non évalué » (tiret) et sort de la moyenne ; la note finale est la moyenne pondérée des critères réellement évalués.
- La matrice s'affiche alors en une seule ligne « Entretien complet », avec une colonne par critère.

### C. Analyse orale débloquée, uniquement pour Tango
- Le minimum d'un seul extrait audio ne s'applique qu'au poste « Vidéo de présentation » de l'organisation Tango. Tous les autres postes gardent le comportement actuel.

### D. Recalculer les neuf fiches déjà importées
Relancer transcription complète, notation par critères et matrice sur les neuf candidats importés, sans retélécharger les vidéos et sans envoyer aucun e-mail.

## Détails techniques

- `supabase/functions/import-external-candidates/index.ts` : suppression de l'appel `splitTranscript` et des messages supplémentaires ; un seul `session_message` candidat, `question_id = null`, contenu = transcript intégral.
- `supabase/functions/generate-report/index.ts` : mode « entretien libre » quand `session.end_reason = 'imported_external'` — prompt sans liste de questions, pas de `question_evaluations`, `fit_breakdown` construit uniquement sur les critères du poste avec preuve citée ; suppression du rattrapage qui recrée des entrées vides ; note globale = moyenne pondérée des critères évalués.
- `supabase/functions/generate-fit-matrix/index.ts` : mode ligne unique quand aucun message n'est rattaché à une question, pondérations issues du poste, critères sans preuve marqués `not_evaluated`.
- `supabase/functions/analyze-paraverbal/index.ts` : seuil abaissé à un extrait seulement si `project.id = eb7db435-1f2f-4ccf-a2ff-f49d68f851db` (Tango, « Vidéo de présentation ») ; seuil de deux inchangé partout ailleurs.
- Script de relance sur les neuf sessions `end_reason = 'imported_external'`, sans appel aux fonctions d'envoi d'e-mail.
- « Cadre et présentation » restera non évalué tant que l'image n'est pas analysée : le rapport ne l'inventera plus à partir du texte. L'analyse d'images extraites de la vidéo peut s'ajouter dans un second temps.

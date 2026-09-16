# Lenteur de chargement + libellé « Complété » sans rapport

## 1. Le libellé d'Olivier Valentin : ce que disent les données (vérifié)

Session `5ad9a4b5-47b8-4630-9dc4-d701fb4850a4` (Olivier Valentin) :

```text
entretien terminé      16/09 08:03:37 UTC  (10:03 Paris)
travail d'analyse créé 16/09 08:03:37 UTC
rapport enregistré     16/09 08:05:47 UTC  (10:05 Paris)
travail terminé        16/09 08:06:16 UTC   attempts = 1, aucune erreur
```

Ta capture est datée de 10:04 Paris : à cet instant le rapport n'existait pas encore, il est arrivé 1 min 45 plus tard. Le rapport est aujourd'hui bien présent.

Pourquoi « Complété » quand même : le badge lit uniquement `sessions.status`.
`src/components/SessionStatusBadge.tsx` ne regarde jamais la table `reports`.
Le statut passe à `completed` dès la dernière question, donc il y a toujours une
fenêtre de 1,5 à 5 minutes où le libellé dit « Complété » sans rapport.

## 2. Les modèles IA : aucun problème constaté (vérifié)

Journal de la passerelle IA sur les 7 derniers jours : 1054 appels, ceux de cette
session en `status: success (http 200)`, modèle `google/gemini-3.7-flash`,
durées 3,5 s à 33,5 s. Aucun 429, aucun 402, aucune erreur.

Le délai vient de la chaîne, pas du modèle : la file est traitée par une tâche
planifiée **toutes les minutes** (`process-report-queue-every-minute`), qui prend
3 entretiens à la fois **espacés de 10 s** (`BATCH_SIZE = 3`, `SPACING_MS = 10_000`
dans `supabase/functions/process-report-queue/index.ts`), et chaque entretien
enchaîne transcription + rapport + matrice. Sur les 15 derniers travaux, le délai
total va de **85 s à 309 s** (médiane ≈ 128 s).

## 3. La lenteur des sessions candidats : cause mesurée

Relevé Postgres (`pg_stat_statements`), requête la plus coûteuse de la base :

```text
10 766 appels — moyenne 781 ms — pic 4 653 ms — total 8 412 s
reports INNER JOIN sessions WHERE sessions.project_id = ...
```

C'est exactement la requête de `src/pages/ProjectDetail.tsx` ligne 261-264. Juste
au-dessus (ligne 243-248), la page charge **toutes** les sessions du poste d'un
coup, sans limite : 167 candidats sur « Première étape Castalie », 108 sur
« Morning ». La pagination (25/page, ligne 207) est appliquée après coup, côté
navigateur. Les index existent déjà (`idx_reports_session_id`,
`idx_sessions_project_created`) : le coût vient du volume ramené, pas d'un index
manquant.

Deuxième poste de coût, même écran :

```text
21 078 appels — moyenne 119 ms — total 2 510 s
session_messages WHERE session_id = ANY(...) AND role = candidate AND video_segment_url NOT NULL
```

## Corrections proposées

1. **Libellé honnête** : quand une session est `completed` mais sans rapport et
   que le travail d'analyse n'a pas échoué, afficher « Analyse en cours » au lieu
   de « Complété », sur le tableau de bord et dans la liste d'un poste. Aucune
   donnée modifiée, seulement l'affichage.
2. **Liste d'un poste plus rapide** : ne charger que la page affichée (25
   candidats) côté serveur, et les rapports de ces 25 seulement, avec le compte
   total pour la pagination. Les filtres et le tri restent identiques.
3. Ne rien changer à la file d'analyse, au scoring, à la matrice ni aux modèles.

## Impact sur la construction de l'application

Risque faible à ciblé : deux fichiers d'affichage (`SessionStatusBadge.tsx`,
`ProjectDetail.tsx`) plus le calcul du badge dans le tableau de bord. Aucune
migration, aucun changement de stockage, de sécurité, de transcription, de
scoring ni de rapport. Côté recruteur : la liste d'un poste s'ouvre plus vite et
le statut devient exact. Côté candidat : aucun changement, ces écrans ne sont pas
utilisés dans le parcours d'entretien. Risque résiduel : le passage à une
pagination serveur change la façon dont les filtres comptent les résultats ; je
conserve le compte total par requête `count` pour que les chiffres affichés
restent les mêmes, et je vérifie sur « Première étape Castalie » (167 candidats).

## Tests E2E après approbation

1. Candidat : parcours d'entretien de démonstration, enregistrement vidéo, aucune
   erreur console.
2. Recruteur : ouverture de « Première étape Castalie » (167 candidats), mesure du
   temps d'affichage avant/après, navigation entre pages, vérification qu'une
   session terminée sans rapport affiche « Analyse en cours » puis « Complété »
   une fois le rapport généré.

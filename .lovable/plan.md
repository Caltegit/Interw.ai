# Bouton « Pas d'accord avec la note » (Fit Poste)

## Est-ce pertinent ?
Oui, à une condition : le recruteur garde la main. Le recruteur connaît le terrain (accent gênant pour un poste client, expérience non évoquée, etc.), et l'IA ne le voit pas dans la transcription. Le risque : que les notes finissent par refléter les préférences d'une seule personne, voire des biais (âge, accent, origine). D'où : validation obligatoire, historique visible, et une consigne à l'IA d'ignorer tout motif discriminatoire.

## Ce que verra le recruteur
1. Sous la note Fit Poste, un bouton discret « Pas d'accord avec la note ».
2. Une fenêtre : note qu'il estime juste (facultative, 0-100) + commentaire obligatoire (« Pourquoi ? »).
3. L'IA relit l'entretien avec ce commentaire et propose une nouvelle note, avec une courte explication (ce qu'elle retient ou refuse du commentaire).
4. Le recruteur choisit : « Appliquer la nouvelle note » ou « Garder l'ancienne ».
5. Si appliquée : la note affichée change, avec une petite mention « Note révisée » et au survol l'ancienne note, l'auteur, la date et le commentaire.

## Réutilisation pour les candidats suivants
Les désaccords validés d'un même poste (les 10 plus récents) sont transmis à l'IA lors des prochains rapports de ce poste, comme « précisions du recruteur ». Ils orientent l'interprétation des critères, sans jamais remplacer les critères du poste. Un recruteur peut supprimer un de ses désaccords pour qu'il ne serve plus.

## Hors périmètre
Critères détaillés, matrice, roue des profils, recommandation : inchangés. Parcours candidat : aucun changement.

## Impact
- Candidat : aucun effet, rien n'est modifié côté entretien.
- Recruteur : un bouton et une fenêtre en plus ; rien ne change tant qu'il ne valide pas.
- Données : nouvelle table séparée ; la note d'origine est conservée, jamais écrasée sans trace. Anciens rapports intacts.
- Scoring des futurs candidats : légèrement influencé par les désaccords validés du poste (voulu). Garde-fou : consigne anti-discrimination, limite à 10 désaccords, suppression possible.
- Build : risque faible (ajouts, pas de refonte). Coût IA : un appel par désaccord.
- Classements et tri par note : utiliseront la note révisée si elle existe.

## Détails techniques
- Migration : table `score_disputes` (session_id, report_id, organization_id, project_id, created_by, original_score, suggested_score, comment, ai_proposed_score, ai_explanation, status `pending|applied|dismissed`, applied_at, created_at) avec GRANT, RLS membres de l'organisation (lecture/création), modification par l'auteur ou admin. Colonnes `reports.overall_score_revised numeric` et `revised_dispute_id uuid` ; `overall_score` d'origine jamais modifié.
- Fonction serveur `rescore-with-feedback` : vérifie l'accès, relit transcription + critères + commentaire, modèle `openai/gpt-6-astra` en streaming, sortie structurée {score, explanation}.
- `generate-report` : ajoute au prompt les désaccords `applied` du poste (10 derniers), avec consigne d'ignorer tout motif lié à l'âge, au sexe, à l'origine, à l'accent ou au handicap.
- Front : bouton + fenêtre dans `DecisionBanner.tsx`/`SessionReportView.tsx`, affichage `overall_score_revised ?? overall_score` là où le Fit Poste est affiché (fiche, liste, comparaison, tableau de bord).

## Vérification
Après approbation : test E2E candidat puis recruteur (actuellement bloqués par le module de configuration manquant, déjà connu), plus contrôle direct de la fiche : désaccord, proposition IA, validation, affichage « Note révisée ».

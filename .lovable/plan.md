
# Refonte du rapport de session

## Diagnostic du rapport actuel

**Sur le fond**
- 3 résumés qui se chevauchent (`executive_summary_short`, `executive_summary`, `strengths/areas`)
- Big Five générique, peu actionnable pour un recruteur (jargon psy)
- Scores éparpillés : score global, score critères, score questions, score soft skills, score motivations → aucun ne ressort
- Pas de lien clair entre **ce que demande le poste** (critères) et **la décision finale**
- "Points forts / Axes d'amélioration" = listes plates sans preuve ni sévérité
- Aucune notion de **fit vs poste** ni de **comparatif explicite avec d'autres candidats**
- Pas de "verdict en 10 secondes" lisible

**Sur la forme**
- 9 cartes empilées dans l'onglet Synthèse → fatigue visuelle
- Pas de hiérarchie : le score global a la même importance qu'une soft skill
- L'onglet Questions montre la vidéo mais pas la transcription de la réponse
- Aucune action rapide (shortlister, rejeter, comparer) depuis le rapport

---

## Nouvelle structure du rapport

### A. Le fond — ce que l'IA produit

On remplace l'analyse "encyclopédique" par une analyse **orientée décision**.

**1. Verdict (nouveau, central)**
- `recommendation` : `strong_yes` | `yes` | `maybe` | `no` (existe déjà)
- `verdict_headline` : une phrase de 80 caractères max — la phrase qu'un recruteur lirait à son manager ("Profil senior très autonome, à valider sur la dimension management")
- `decision_drivers` : 2 à 4 raisons clés derrière la reco, chacune avec sentiment positif/neutre/négatif et citation

**2. Adéquation au poste (nouveau, remplace les listes plates)**
- `fit_score` global 0-100 calculé à partir des critères pondérés du projet
- `fit_breakdown` : pour chaque critère du projet → score, niveau (`excellent` / `solid` / `partial` / `gap`), preuve citée, et **un constat** ("Maîtrise les outils X et Y, mais aucune expérience démontrée sur Z")
- C'est ça qui remplace `criteria_scores` actuel + une partie des points forts/faibles

**3. Réponses aux questions (enrichi)**
- Pour chaque question : score 0-10, **résumé 1 phrase de la réponse**, citation marquante, et **niveau de profondeur** (`surface` / `concret` / `expert`)
- Indique si une **relance a été déclenchée** et si elle a fait progresser la réponse
- Highlight des **drapeaux par question** ("réponse évasive", "exemple chiffré convaincant", "contradiction avec Q2")

**4. Communication & comportement (remplace Big Five)**
On garde de la psycho mais en termes utiles au recrutement :
- `communication` : clarté, structure, concision (3 sous-scores 0-10 + 1 phrase)
- `posture` : assurance, écoute, capacité à se remettre en question
- `energie` : engagement perçu, enthousiasme pour le poste
- Chaque dimension = score + 1 ligne d'interprétation + 1 citation
- Big Five conservé mais déplacé en section "Analyse approfondie" repliable (pour ceux qui le veulent)

**5. Signaux à creuser (consolidé)**
- Fusion `red_flags` + `followup_questions` actuels
- Chaque signal a : sévérité, description, preuve, **et la question à poser en entretien physique** pour lever le doute
- Plus de double-emploi entre les deux cartes

**6. Comparatif (mis en avant)**
- Position du candidat vs moyenne projet : rang ("3e sur 12"), delta de score, et 1 phrase qui dit en quoi il se distingue
- Existe déjà mais reste enfoui dans la synthèse

**Champs supprimés / fusionnés**
- `executive_summary_short` → devient `verdict_headline`
- `strengths` + `areas_for_improvement` → absorbés par `fit_breakdown` + `decision_drivers`
- `motivation_scores` → fusionné dans la dimension "energie"
- `personality_profile` Big Five → conservé en section repliable seulement

### B. La forme — nouvelle interface

Réduction à **3 onglets** au lieu de 4, avec un **bandeau de décision** persistant en haut.

```text
┌──────────────────────────────────────────────────────────────────┐
│  Sophie Martin · Développeuse Senior · 42 min · 8 réponses       │
│                                                                  │
│  ┌──────────┐  ┌─────────────────────────────────────────────┐  │
│  │   78     │  │  RECOMMANDATION : OUI                        │  │
│  │  /100    │  │  « Profil solide, à valider sur le mgmt »   │  │
│  │ Fit poste│  │  3e candidat sur 12 · au-dessus moyenne (+12)│  │
│  └──────────┘  └─────────────────────────────────────────────┘  │
│                              [ Shortlister ]  [ Rejeter ]  [···] │
└──────────────────────────────────────────────────────────────────┘

  [ Décision ]   [ Réponses ]   [ Transcription ]
```

**Onglet 1 — Décision** (par défaut, l'essentiel sur un écran)
1. **Pourquoi cette reco** : 2-4 cartes "decision drivers" colorées (vert/gris/rouge) avec citation
2. **Adéquation au poste** : barre par critère avec niveau coloré + constat 1 ligne. Ouvre un drawer pour voir la preuve complète
3. **Signaux à creuser** : liste compacte avec sévérité + question suggérée pour l'entretien physique
4. **Comparatif projet** : mini-graphe radar candidat vs moyenne, rang, delta
5. **Communication & posture** : 3 mini-jauges (clarté, assurance, énergie)
6. **Notes recruteur** : zone éditable persistante (déjà présente)
7. **Analyse approfondie** (accordéon replié) : Big Five complet pour ceux qui veulent

**Onglet 2 — Réponses** (refondu)
- Liste verticale Q1, Q2, …
- Chaque ligne : badge score, titre question, **résumé 1 phrase de la réponse**, badge profondeur, badge "relancée"
- Clic → expand : vidéo + transcription nettoyée de la réponse + commentaire IA + citation marquante + signaux liés à cette question
- Filtres en haut : "Toutes" / "Avec relance" / "Score < 5" / "Avec signal"

**Onglet 3 — Transcription**
- Quasi inchangé mais : barre de recherche, jump direct depuis n'importe quelle citation des autres onglets (déjà partiellement en place avec `goToMessage`)
- Highlight visuel des messages cités dans le rapport

**Bandeau de décision persistant**
- Reste visible au scroll et à travers les onglets
- Boutons d'action rapide : **Shortlister** / **Rejeter** / **Demander un 2e avis** (équivalent à un statut sur la session)
- Bouton Partager / Télécharger vidéos déjà présents

**Page partagée (`SharedReport`)**
- Reprend exactement la même structure que l'onglet Décision
- Sans actions de décision ni notes recruteur
- Mention "Rapport partagé" et masque les éléments sensibles (notes internes)

---

## Détails techniques

**Modèle de données (`reports`)**

Ajout des colonnes JSONB suivantes (sans casser l'existant) :
- `verdict` : `{ headline, recommendation, drivers: [{label, sentiment, quote, message_id}] }`
- `fit_breakdown` : `[{criterion, score, level, statement, quote, message_id}]`
- `communication_profile` : `{ clarity, structure, concision, posture, energy }` chaque clé = `{score, comment, quote, message_id}`
- `signals` : remplace progressivement `red_flags` et `followup_questions` — `[{severity, label, description, quote, message_id, suggested_question}]`
- `question_evaluations` enrichi : ajout de `summary`, `depth_level`, `had_followup`, `followup_helped`, `signal_ids`

Les anciens champs (`strengths`, `areas_for_improvement`, `executive_summary_short`, `red_flags`, `followup_questions`, `motivation_scores`, `personality_profile`) sont **conservés** : on les laisse pour les rapports déjà générés et on lit d'abord les nouveaux champs en fallback sur les anciens dans l'UI.

**Edge function `generate-report`**
- Nouveau prompt système orienté "rapport de décision" plutôt que "analyse 360°"
- Nouveau schéma de tool calling avec les nouvelles structures
- On garde `google/gemini-2.5-pro` (déjà choisi)
- Calcul du `fit_score` côté code (pondération des critères) plutôt que demandé à l'IA, plus fiable

**Composants à créer**
- `DecisionBanner.tsx` — bandeau persistant sticky
- `DecisionDriversCard.tsx` — les 2-4 raisons clés
- `FitBreakdownCard.tsx` — adéquation par critère avec drawer de preuve
- `SignalsCard.tsx` — fusion red_flags + followups
- `CommunicationProfileCard.tsx` — 3 jauges
- `QuestionAnswerRow.tsx` — ligne expand/collapse pour onglet Réponses
- `DeepAnalysisAccordion.tsx` — wrapper repliable pour Big Five conservé

**Composants à supprimer après migration**
- `ExecutiveSummaryCard` (intégré au bandeau)
- `MotivationScoresCard` (fusionné dans communication.energy)
- `FollowupQuestionsCard` (fusionné dans signals)
- `RedFlagsCard` (remplacé par `SignalsCard`)

**Pages impactées**
- `src/pages/SessionDetail.tsx` — refonte structure (bandeau + 3 onglets)
- `src/pages/SharedReport.tsx` — alignement sur la nouvelle structure (lecture seule)
- `src/hooks/queries/useSessionDetail.ts` — fetch des nouveaux champs (déjà en `select *` pour le report donc transparent)

**Bouton "Régénérer le rapport"**
- Ajouté dans le bandeau (menu `…`) pour permettre aux rapports existants de bénéficier de la nouvelle analyse

---

## Question avant de lancer

Une seule chose à valider : sur le bandeau de décision, veux-tu de vraies **actions de statut candidat** (Shortlister / Rejeter / 2e avis) qui changent un état persistant en base, ou juste les boutons existants (Partager / Télécharger) pour cette première version ? La seconde option est plus rapide ; la première demande une petite migration pour ajouter un champ `recruiter_decision` sur `sessions`.
